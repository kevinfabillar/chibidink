using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Sessions;

public sealed class Court : Entity
{
    public Guid SessionId { get; private set; }
    public int Number { get; private set; }
    public CourtStatus Status { get; private set; } = CourtStatus.Available;
    public Guid? CurrentMatchId { get; private set; }

    public bool IsFree => Status == CourtStatus.Available && CurrentMatchId is null;

    private Court() { } // EF

    internal Court(Guid sessionId, int number)
    {
        SessionId = sessionId;
        Number = number;
    }

    internal void Occupy(Guid matchId)
    {
        Guard.That(Status == CourtStatus.Available, $"Court {Number} is unavailable.");
        Guard.That(CurrentMatchId is null, $"Court {Number} already has a match.");
        CurrentMatchId = matchId;
    }

    internal void Release(Guid matchId)
    {
        if (CurrentMatchId == matchId) CurrentMatchId = null;
    }

    internal void SetAvailable(bool available)
    {
        if (!available)
            Guard.That(CurrentMatchId is null, $"Finish or move the match on court {Number} first.");
        Status = available ? CourtStatus.Available : CourtStatus.Unavailable;
    }
}
