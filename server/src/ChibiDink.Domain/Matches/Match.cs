using ChibiDink.Domain.Common;
using ChibiDink.Domain.Scoring;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Domain.Matches;

/// <summary>
/// One real-life game on one court. Owns its lifecycle:
/// AwaitingConfirmation → Ready → Playing → PendingResult → Completed (or Cancelled / Voided).
/// Every transition also keeps the court and the session participants consistent.
/// </summary>
public sealed class Match : Entity
{
    private readonly List<MatchParticipant> _participants = [];

    public Guid SessionId { get; private set; }
    public Guid CourtId { get; private set; }
    public int CourtNumber { get; private set; }
    public MatchFormat Format { get; private set; }
    public MatchStatus Status { get; private set; } = MatchStatus.Proposed;
    public bool IsManual { get; private set; }
    public bool IsMixedSkill { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? ConfirmationDeadline { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? EndedAt { get; private set; }
    public MatchResult? Result { get; private set; }
    public string? CancelReason { get; private set; }

    /// <summary>Mirrors "not terminal" so the database can enforce one live match per court.</summary>
    public bool IsActive { get; private set; } = true;

    /// <summary>Optimistic concurrency token (PostgreSQL xmin).</summary>
    public uint Version { get; private set; }

    public IReadOnlyList<MatchParticipant> Participants => _participants;
    public IEnumerable<MatchParticipant> TeamA => _participants.Where(p => p.Team == Team.A);
    public IEnumerable<MatchParticipant> TeamB => _participants.Where(p => p.Team == Team.B);
    public IEnumerable<Guid> PlayerIds => _participants.Select(p => p.UserId);

    private Match() { } // EF

    /// <summary>
    /// Reserves the players and the court. With automatic queueing (no confirmation window) the match
    /// is live straight away; otherwise it waits for the players to accept.
    /// </summary>
    public static Match Propose(
        PlaySession session, Court court,
        IReadOnlyCollection<Guid> teamA, IReadOnlyCollection<Guid> teamB,
        DateTimeOffset now, bool isManual, bool isMixedSkill = false)
    {
        session.EnsureNotClosed();
        var perTeam = session.Format.PlayersPerTeam();
        Guard.That(teamA.Count == perTeam && teamB.Count == perTeam,
            $"{session.Format} needs {perTeam} player(s) per team.");
        Guard.That(teamA.Concat(teamB).Distinct().Count() == perTeam * 2, "A player can only appear once in a match.");

        var match = new Match
        {
            SessionId = session.Id,
            CourtId = court.Id,
            CourtNumber = court.Number,
            Format = session.Format,
            IsManual = isManual,
            IsMixedSkill = isMixedSkill,
            CreatedAt = now,
        };

        foreach (var (userId, team) in teamA.Select(u => (u, Team.A)).Concat(teamB.Select(u => (u, Team.B))))
        {
            session.GetParticipant(userId).Reserve(now);
            match._participants.Add(new MatchParticipant(match.Id, userId, team));
        }
        court.Occupy(match.Id);

        var window = session.Settings.ConfirmationWindowSeconds;
        if (window > 0)
        {
            match.Status = MatchStatus.AwaitingConfirmation;
            match.ConfirmationDeadline = now.AddSeconds(window);
        }
        else
        {
            match.MarkAllAccepted();
            match.Status = MatchStatus.Playing;
            match.StartedAt = now;
        }
        return match;
    }

    public MatchParticipant? FindPlayer(Guid userId) => _participants.FirstOrDefault(p => p.UserId == userId);

    public bool Involves(Guid userId) => FindPlayer(userId) is not null;

    /// <summary>True when this player has something to do now: confirm, head to the court, or verify the score.</summary>
    public bool NeedsActionFrom(Guid userId) => Status switch
    {
        MatchStatus.AwaitingConfirmation => FindPlayer(userId)?.Confirmation == ConfirmationStatus.Pending,
        MatchStatus.Ready => Involves(userId),
        MatchStatus.PendingResult => CanVerify(userId, isOrganizer: false),
        _ => false,
    };

    private MatchParticipant GetPlayer(Guid userId) =>
        FindPlayer(userId) ?? throw new ForbiddenException("You are not playing in this match.");

    // ---- Confirmation -------------------------------------------------------------------------

    public void Accept(Guid userId)
    {
        RequireStatus(MatchStatus.AwaitingConfirmation);
        GetPlayer(userId).Accept();
        if (_participants.All(p => p.Confirmation == ConfirmationStatus.Accepted))
        {
            Status = MatchStatus.Ready;
            ConfirmationDeadline = null;
        }
    }

    /// <summary>A player declines: the match is cancelled, they go to the back of the line, everyone else keeps their spot.</summary>
    public void Decline(PlaySession session, Guid userId, DateTimeOffset now)
    {
        RequireStatus(MatchStatus.AwaitingConfirmation);
        GetPlayer(userId).Decline();
        CancelInternal(session, $"Declined by a player", now, stepAway: [], toBack: [userId]);
    }

    public bool IsConfirmationExpired(DateTimeOffset now) =>
        Status == MatchStatus.AwaitingConfirmation && ConfirmationDeadline <= now;

    /// <summary>Confirmation window ran out: players who never answered step away; the rest keep their spot.</summary>
    public void ExpireConfirmation(PlaySession session, DateTimeOffset now)
    {
        Guard.That(IsConfirmationExpired(now), "The confirmation window is still open.");
        var silent = _participants.Where(p => p.Confirmation != ConfirmationStatus.Accepted).Select(p => p.UserId).ToList();
        CancelInternal(session, "Confirmation timed out", now, stepAway: silent, toBack: []);
    }

    // ---- Play ---------------------------------------------------------------------------------

    /// <summary>Marks the real-life game as started. Organizers may skip outstanding confirmations.</summary>
    public void Start(DateTimeOffset now, bool byOrganizer)
    {
        if (byOrganizer && Status == MatchStatus.AwaitingConfirmation) MarkAllAccepted();
        RequireStatus(MatchStatus.Ready);
        Status = MatchStatus.Playing;
        StartedAt = now;
    }

    public void ReportResult(IScoringRule rule, int teamAScore, int teamBScore, Guid reporterId, string? notes, DateTimeOffset now)
    {
        RequireStatus(MatchStatus.Playing, MatchStatus.PendingResult);
        rule.Validate(teamAScore, teamBScore);
        var trimmedNotes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim()[..Math.Min(notes.Trim().Length, 280)];
        Result = new MatchResult(teamAScore, teamBScore, reporterId, now, trimmedNotes);
        Status = MatchStatus.PendingResult;
    }

    /// <summary>
    /// The organizer, or a player on the team that did not report, may verify a result.
    /// The reporting team can't verify its own score.
    /// </summary>
    public bool CanVerify(Guid userId, bool isOrganizer)
    {
        if (Status != MatchStatus.PendingResult || Result is null) return false;
        if (isOrganizer) return true;
        var verifier = FindPlayer(userId);
        var reporter = FindPlayer(Result.ReportedById);
        return verifier is not null && (reporter is null || verifier.Team != reporter.Team);
    }

    /// <summary>
    /// Finalizes the result exactly once: updates session records, frees the court,
    /// and returns the outcome for statistics and rewards.
    /// </summary>
    public MatchOutcome Verify(PlaySession session, Guid verifierId, DateTimeOffset now)
    {
        RequireStatus(MatchStatus.PendingResult);
        if (!CanVerify(verifierId, session.IsOrganizer(verifierId)))
            throw new ForbiddenException("Only the organizer or the other team can verify this score.");

        Result = Result! with { VerifiedById = verifierId, VerifiedAt = now };
        Status = MatchStatus.Completed;
        EndedAt = now;

        var minutes = StartedAt is null ? 0 : (int)Math.Round((now - StartedAt.Value).TotalMinutes);
        var winner = Result.Winner;
        foreach (var p in _participants)
            session.GetParticipant(p.UserId).CompleteGame(now, minutes, p.Team == winner);

        Finish(session);
        return new MatchOutcome(Id, SessionId, Format,
            Winners: _participants.Where(p => p.Team == winner).Select(p => p.UserId).ToList(),
            Losers: _participants.Where(p => p.Team != winner).Select(p => p.UserId).ToList());
    }

    // ---- Organizer overrides ------------------------------------------------------------------

    public void Cancel(PlaySession session, string reason, DateTimeOffset now)
    {
        Guard.That(Status.IsPrePlay(), "Only matches that haven't started can be cancelled. Void it instead.");
        CancelInternal(session, reason, now, stepAway: []);
    }

    /// <summary>Discards a started match without a result.</summary>
    public void Void(PlaySession session, string reason, DateTimeOffset now)
    {
        Guard.That(Status is MatchStatus.Playing or MatchStatus.PendingResult, "Only started matches can be voided.");
        Status = MatchStatus.Voided;
        CancelReason = reason;
        EndedAt = now;
        foreach (var p in _participants) session.GetParticipant(p.UserId).ReleaseWithoutResult(now);
        Finish(session);
    }

    /// <summary>Swaps a player before or during play (before a score). The replaced player keeps their queue priority.</summary>
    public void ReplacePlayer(PlaySession session, Guid outgoingId, Guid incomingId, DateTimeOffset now)
    {
        Guard.That(Status.IsPrePlay() || Status == MatchStatus.Playing, "Players can only be swapped before a score is entered.");
        Guard.That(!Involves(incomingId), "That player is already in this match.");
        var outgoing = FindPlayer(outgoingId) ?? throw new DomainException("That player is not in this match.");

        session.GetParticipant(incomingId).Reserve(now);
        session.GetParticipant(outgoingId).ReturnToQueue();

        outgoing.Deactivate();
        _participants.Remove(outgoing);
        _participants.Add(new MatchParticipant(Id, incomingId, outgoing.Team));
        if (Status.IsPrePlay()) RestartConfirmation(session, now);
        else _participants.Last().Accept();
    }

    /// <summary>Switches two players on this court between the teams (one from each), before a score is entered.</summary>
    public void SwitchTeams(Guid firstId, Guid secondId)
    {
        Guard.That(Status.IsPrePlay() || Status == MatchStatus.Playing, "Teams can only be changed before a score is entered.");
        var first = FindPlayer(firstId) ?? throw new DomainException("That player is not in this match.");
        var second = FindPlayer(secondId) ?? throw new DomainException("That player is not in this match.");
        Guard.That(first.Team != second.Team, "Pick one player from each team.");
        var team = first.Team;
        first.MoveTo(second.Team);
        second.MoveTo(team);
    }

    public void MoveToCourt(PlaySession session, Court target)
    {
        Guard.That(Status.IsPrePlay() || Status == MatchStatus.Playing, "This match can no longer be moved.");
        Guard.That(target.Id != CourtId, "The match is already on that court.");
        target.Occupy(Id);
        session.GetCourt(CourtId).Release(Id);
        CourtId = target.Id;
        CourtNumber = target.Number;
    }

    // ---- Internals ----------------------------------------------------------------------------

    private void CancelInternal(PlaySession session, string reason, DateTimeOffset now, IReadOnlyCollection<Guid> stepAway, IReadOnlyCollection<Guid>? toBack = null)
    {
        Status = MatchStatus.Cancelled;
        CancelReason = reason;
        EndedAt = now;
        foreach (var p in _participants)
        {
            var participant = session.GetParticipant(p.UserId);
            if (stepAway.Contains(p.UserId)) participant.StepAway();
            else if (toBack?.Contains(p.UserId) == true) participant.RequeueAtBack(now);
            else participant.ReturnToQueue();
        }
        Finish(session);
    }

    private void Finish(PlaySession session)
    {
        IsActive = false;
        ConfirmationDeadline = null;
        foreach (var p in _participants) p.Deactivate();
        session.GetCourt(CourtId).Release(Id);
    }

    private void RestartConfirmation(PlaySession session, DateTimeOffset now)
    {
        var window = session.Settings.ConfirmationWindowSeconds;
        if (window == 0)
        {
            MarkAllAccepted();
            return;
        }
        foreach (var p in _participants) p.ResetConfirmation();
        Status = MatchStatus.AwaitingConfirmation;
        ConfirmationDeadline = now.AddSeconds(window);
    }

    private void MarkAllAccepted()
    {
        foreach (var p in _participants) p.Accept();
        Status = MatchStatus.Ready;
        ConfirmationDeadline = null;
    }

    private void RequireStatus(params MatchStatus[] allowed)
    {
        if (!allowed.Contains(Status))
            throw new DomainException($"This match is {Status}; that action isn't possible right now.");
    }
}

/// <summary>What a verified match means for the people who played it.</summary>
public sealed record MatchOutcome(
    Guid MatchId, Guid SessionId, MatchFormat Format,
    IReadOnlyList<Guid> Winners, IReadOnlyList<Guid> Losers);
