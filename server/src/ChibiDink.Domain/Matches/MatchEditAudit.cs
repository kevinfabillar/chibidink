using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Matches;

/// <summary>Immutable record of an organizer override.</summary>
public sealed class MatchEditAudit : Entity
{
    public Guid SessionId { get; private set; }
    public Guid? MatchId { get; private set; }
    public Guid ActorId { get; private set; }
    public string Action { get; private set; } = "";
    public string Details { get; private set; } = "";
    public DateTimeOffset At { get; private set; }

    private MatchEditAudit() { } // EF

    public MatchEditAudit(Guid sessionId, Guid? matchId, Guid actorId, string action, string details, DateTimeOffset at)
    {
        SessionId = sessionId;
        MatchId = matchId;
        ActorId = actorId;
        Action = action;
        Details = details;
        At = at;
    }
}
