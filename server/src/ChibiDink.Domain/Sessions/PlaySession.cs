using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Sessions;

/// <summary>A friendly doubles session with 1–6 courts and one shared waiting pool.</summary>
public sealed class PlaySession : Entity
{
    public const int MinCourts = 1;
    public const int MaxCourts = 6;

    private readonly List<Court> _courts = [];
    private readonly List<SessionParticipant> _participants = [];

    public string Title { get; private set; } = "";
    public string Location { get; private set; } = "";
    public DateTimeOffset ScheduledAt { get; private set; }
    public MatchFormat Format { get; private set; }
    public SessionStatus Status { get; private set; } = SessionStatus.Open;
    public string InviteCode { get; private set; } = "";
    public Guid OrganizerId { get; private set; }
    public SessionSettings Settings { get; private set; } = new();
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? ClosedAt { get; private set; }

    public IReadOnlyList<Court> Courts => _courts;
    public IReadOnlyList<SessionParticipant> Participants => _participants;

    public bool IsClosed => Status == SessionStatus.Closed;
    public bool IsMatchmakingActive => Status == SessionStatus.Active;

    private PlaySession() { } // EF

    public static PlaySession Create(
        Guid organizerId, string title, string location, DateTimeOffset scheduledAt,
        MatchFormat format, int courtCount, SessionSettings settings,
        string inviteCode, SkillLevel organizerSkill, DateTimeOffset now)
    {
        Guard.That(courtCount is >= MinCourts and <= MaxCourts, $"A session has {MinCourts}–{MaxCourts} courts.");
        Guard.That(format == MatchFormat.Doubles, "Sessions are doubles only.");

        var session = new PlaySession
        {
            OrganizerId = organizerId,
            Title = Guard.NotBlank(title, "Title", 80),
            Location = Guard.NotBlank(location, "Location", 120),
            ScheduledAt = scheduledAt.ToUniversalTime(),
            Format = format,
            Settings = settings.Validated(),
            InviteCode = inviteCode,
            CreatedAt = now,
        };
        for (var n = 1; n <= courtCount; n++) session._courts.Add(new Court(session.Id, n));
        var organizer = new SessionParticipant(session.Id, organizerId, SessionRole.Organizer, organizerSkill, now);
        organizer.EnterQueue(now);
        session._participants.Add(organizer);
        return session;
    }

    public SessionParticipant? FindParticipant(Guid userId) => _participants.FirstOrDefault(p => p.UserId == userId);

    public SessionParticipant GetParticipant(Guid userId) =>
        FindParticipant(userId) ?? throw new DomainException("That player is not part of this session.");

    public Court GetCourt(int number) =>
        _courts.FirstOrDefault(c => c.Number == number) ?? throw new DomainException($"Court {number} does not exist.");

    public Court GetCourt(Guid courtId) =>
        _courts.FirstOrDefault(c => c.Id == courtId) ?? throw new DomainException("Court does not exist.");

    public IEnumerable<Court> FreeCourts() => _courts.Where(c => c.IsFree).OrderBy(c => c.Number);

    public IEnumerable<SessionParticipant> WaitingPlayers() =>
        _participants.Where(p => p.Status == ParticipantStatus.Waiting);

    public bool IsOrganizer(Guid userId) => FindParticipant(userId)?.IsOrganizer == true;

    public void EnsureOrganizer(Guid userId)
    {
        if (!IsOrganizer(userId)) throw new ForbiddenException("Only the session organizer can do that.");
    }

    public void EnsureNotClosed() => Guard.That(!IsClosed, "This session is closed.");

    /// <summary>Games are only made once the organizer has started the session (players can check in before).</summary>
    public void EnsureStarted()
    {
        EnsureNotClosed();
        Guard.That(IsMatchmakingActive, "Start the session first. Players can check in, but games begin once you start it.");
    }

    public SessionParticipant Join(Guid userId, SkillLevel skill, DateTimeOffset now)
    {
        EnsureNotClosed();
        var existing = FindParticipant(userId);
        if (existing is not null)
        {
            existing.Rejoin();
            return existing;
        }
        Guard.That(Settings.OpenAdmission, "This session is not accepting new players.");
        var participant = new SessionParticipant(Id, userId, SessionRole.Player, skill, now);
        _participants.Add(participant);
        return participant;
    }

    public void UpdateDetails(string title, string location, DateTimeOffset scheduledAt)
    {
        EnsureNotClosed();
        Title = Guard.NotBlank(title, "Title", 80);
        Location = Guard.NotBlank(location, "Location", 120);
        ScheduledAt = scheduledAt.ToUniversalTime();
    }

    public void UpdateSettings(SessionSettings settings)
    {
        EnsureNotClosed();
        Settings = settings.Validated();
    }

    public void StartMatchmaking()
    {
        EnsureNotClosed();
        Status = SessionStatus.Active;
    }

    public void PauseMatchmaking()
    {
        EnsureNotClosed();
        Status = SessionStatus.Open;
    }

    public void SetCourtAvailability(int courtNumber, bool available)
    {
        EnsureNotClosed();
        GetCourt(courtNumber).SetAvailable(available);
    }

    /// <summary>Closes the session. All court matches must already be finished, cancelled, or voided.</summary>
    public void Close(DateTimeOffset now)
    {
        EnsureNotClosed();
        Guard.That(_courts.All(c => c.CurrentMatchId is null), "Resolve all court matches before closing.");
        Status = SessionStatus.Closed;
        ClosedAt = now;
        foreach (var p in _participants.Where(p => p.Status == ParticipantStatus.Waiting)) p.Pause();
    }
}
