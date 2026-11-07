namespace ChibiDink.Domain.Sessions;

/// <summary>
/// A group of four the organizer set up in the queue. It goes on the next free court once all four
/// are off court and waiting, ahead of the matchmaker's own picks.
/// </summary>
public sealed record PlannedGroup(Guid[] TeamA, Guid[] TeamB)
{
    public IEnumerable<Guid> Players => TeamA.Concat(TeamB);
}
