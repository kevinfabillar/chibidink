namespace ChibiDink.Domain.Matchmaking;

/// <summary>The single definition of "who is next", shared by the matchmaker and the queue screen.</summary>
public static class QueuePriority
{
    /// <summary>Protected (long-waiting) players first, then fewest games, then longest wait.</summary>
    public static IEnumerable<QueueCandidate> Order(IEnumerable<QueueCandidate> candidates, DateTimeOffset now, TimeSpan waitProtection) =>
        candidates
            .OrderByDescending(c => now - c.WaitingSince >= waitProtection)
            .ThenBy(c => c.CompletedGames)
            .ThenBy(c => c.WaitingSince)
            .ThenBy(c => c.UserId);
}
