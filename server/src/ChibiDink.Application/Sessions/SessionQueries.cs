using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Common;
using ChibiDink.Application.Contracts;
using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Matchmaking;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Sessions;

/// <summary>Read-only views of sessions. Kept apart from the services that change them.</summary>
public interface ISessionQueries
{
    Task<SessionDetailDto> GetDetailAsync(Guid sessionId, CancellationToken ct);
    Task<IReadOnlyList<SessionSummaryDto>> ListMineAsync(CancellationToken ct);
    Task<InvitePreviewDto> GetInvitePreviewAsync(string inviteCode, CancellationToken ct);
    Task<IReadOnlyList<AuditEntryDto>> GetAuditAsync(Guid sessionId, CancellationToken ct);
}

public sealed class SessionQueries(
    ISessionRepository sessions,
    IMatchRepository matches,
    IPlayerProfileRepository profiles,
    IAuditLog audit,
    IMatchmakingStrategy strategy,
    ISessionViewCache cache,
    ICurrentUser currentUser,
    IClock clock) : ISessionQueries
{
    public async Task<SessionDetailDto> GetDetailAsync(Guid sessionId, CancellationToken ct)
    {
        var viewerId = currentUser.UserId;
        // Shared by everyone in the session (see SessionViewCache); only the viewer's own parts are per request.
        var snapshot = await cache.GetAsync(sessionId, () => LoadSnapshotAsync(sessionId));
        var (session, live, people, participants) = (snapshot.Session, snapshot.Live, snapshot.People, snapshot.Participants);
        var me = session.FindParticipant(viewerId) ?? throw new ForbiddenException("Join this session to see it.");
        var isOrganizer = me.IsOrganizer;

        var matchViews = live.ToDictionary(m => m.Id, m => ViewMapper.Match(m, people, viewerId, isOrganizer));
        var courts = session.Courts.OrderBy(c => c.Number)
            .Select(c => new CourtDto(c.Number, c.Status,
                c.CurrentMatchId is { } id && matchViews.TryGetValue(id, out var view) ? view : null))
            .ToList();

        var myMatch = live.FirstOrDefault(m => m.Involves(viewerId));
        var myGames = snapshot.Completed
            .Where(m => m.Involves(viewerId))
            .Select(m => ViewMapper.History(m, viewerId, people))
            .ToList();

        return new SessionDetailDto(
            session.Id, session.Title, session.Location, session.ScheduledAt, session.Format, session.Status,
            session.InviteCode, session.Settings, isOrganizer,
            participants.FirstOrDefault(p => p.Player.UserId == viewerId),
            myMatch is null ? null : matchViews[myMatch.Id],
            courts, participants, myGames, snapshot.UpNext);
    }

    /// <summary>The viewer-independent part of a session view. Runs without the request's token, since others share it.</summary>
    private async Task<SessionSnapshot> LoadSnapshotAsync(Guid sessionId)
    {
        var ct = CancellationToken.None;
        var session = await sessions.FindAsync(sessionId, ct) ?? throw new NotFoundException("Session");
        var live = await matches.ListLiveAsync(sessionId, ct);
        var completed = await matches.ListCompletedInSessionAsync(sessionId, ct);
        var people = await profiles.GetManyAsync(session.Participants.Select(p => p.UserId), ct);

        var positions = QueuePositions(session);
        var participants = session.Participants
            .Where(p => p.Status != ParticipantStatus.Left)
            .Select(p => Participant(p, people, positions))
            .OrderBy(p => p.QueuePosition ?? int.MaxValue)
            .ThenBy(p => p.Player.DisplayName)
            .ToList();
        var upNext = session.IsClosed ? [] : await UpNextAsync(session, completed, people, ct);
        return new SessionSnapshot(session, live, completed, people, participants, upNext);
    }

    public async Task<IReadOnlyList<SessionSummaryDto>> ListMineAsync(CancellationToken ct)
    {
        var viewerId = currentUser.UserId;
        var list = await sessions.ListForUserAsync(viewerId, 30, ct);
        return list.Select(s => ViewMapper.Summary(s, viewerId)).ToList();
    }

    public async Task<InvitePreviewDto> GetInvitePreviewAsync(string inviteCode, CancellationToken ct)
    {
        var session = await sessions.FindByInviteCodeAsync(inviteCode.Trim().ToUpperInvariant(), ct)
                      ?? throw new NotFoundException("Session");
        var organizer = await profiles.FindAsync(session.OrganizerId, ct);
        return new InvitePreviewDto(
            session.Id, session.Title, session.Location, session.ScheduledAt, session.Format, session.Status,
            session.Courts.Count, session.Participants.Count(p => p.Status != ParticipantStatus.Left),
            organizer?.DisplayName ?? "Organizer");
    }

    public async Task<IReadOnlyList<AuditEntryDto>> GetAuditAsync(Guid sessionId, CancellationToken ct)
    {
        var session = await sessions.FindAsync(sessionId, ct) ?? throw new NotFoundException("Session");
        session.EnsureOrganizer(currentUser.UserId);
        var entries = await audit.ListForSessionAsync(sessionId, 100, ct);
        var people = await profiles.GetManyAsync(entries.Select(e => e.ActorId).Distinct(), ct);
        return entries.Select(e => new AuditEntryDto(e.MatchId,
            people.TryGetValue(e.ActorId, out var p) ? p.DisplayName : "Unknown", e.Action, e.Details, e.At)).ToList();
    }

    /// <summary>
    /// The next groups of four, in order, as the matchmaker would pick them right now (one per court).
    /// The first group goes on the next court that frees up.
    /// </summary>
    private async Task<IReadOnlyList<UpNextDto>> UpNextAsync(PlaySession session, IReadOnlyList<Match> completed, IReadOnlyDictionary<Guid, PlayerProfile> people, CancellationToken ct)
    {
        var history = new PairingHistory();
        foreach (var match in completed.Take(30))
            history.AddMatch(match.TeamA.Select(p => p.UserId).ToList(), match.TeamB.Select(p => p.UserId).ToList());

        var waiting = session.WaitingPlayers().ToList();
        var busy = await matches.FindPlayersInLiveMatchesAsync(waiting.Select(p => p.UserId).ToList(), ct);
        var candidates = waiting
            .Where(p => !busy.Contains(p.UserId)) // still playing somewhere: not in the next groups
            .Select(p => new QueueCandidate(p.UserId, p.SkillEstimate, p.CompletedGames, p.WaitingSince ?? p.JoinedAt))
            .ToList();
        var request = new MatchmakingRequest(
            session.Format, Math.Max(1, session.Courts.Count), candidates, history, clock.UtcNow,
            session.Settings.SkillTolerance, TimeSpan.FromMinutes(session.Settings.WaitProtectionMinutes), session.Settings.Mode);
        var skillOf = session.Participants.ToDictionary(p => p.UserId, p => p.SkillEstimate);
        return strategy.FindLineups(request)
            .Select((l, i) => new UpNextDto(
                i + 1,
                l.TeamA.Select(id => ViewMapper.Card(id, people)).ToList(),
                l.TeamB.Select(id => ViewMapper.Card(id, people)).ToList(),
                session.Settings.Mode == QueueMode.SkillBased && !l.ExceedsSkillTolerance ? SkillLevel.Name(skillOf[l.TeamA[0]]) : null,
                l.ExceedsSkillTolerance))
            .ToList();
    }

    private Dictionary<Guid, int> QueuePositions(PlaySession session)
    {
        var candidates = session.WaitingPlayers()
            .Select(p => new QueueCandidate(p.UserId, p.SkillEstimate, p.CompletedGames, p.WaitingSince ?? p.JoinedAt));
        return QueuePriority.Order(candidates, clock.UtcNow, TimeSpan.FromMinutes(session.Settings.WaitProtectionMinutes))
            .Select((c, index) => (c.UserId, index))
            .ToDictionary(x => x.UserId, x => x.index + 1);
    }

    private static ParticipantDto Participant(SessionParticipant p, IReadOnlyDictionary<Guid, PlayerProfile> people, Dictionary<Guid, int> positions) =>
        new(ViewMapper.Card(p.UserId, people), p.Role, p.Status, p.SkillEstimate,
            p.WaitingSince, positions.TryGetValue(p.UserId, out var pos) ? pos : null,
            p.CompletedGames, p.Wins, p.Losses, PlayerStatistics.WinRateOf(p.Wins, p.Losses));
}
