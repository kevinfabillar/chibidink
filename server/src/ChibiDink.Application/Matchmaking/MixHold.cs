using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Matchmaking;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Matchmaking;

/// <summary>
/// Breaks the "same four forever" loop. With 8 players on 2 courts, a court that finishes has only its own
/// four free, so they'd go straight back on together and the two groups would never meet. Instead, when the
/// only group possible is last game's four and another court is mid-game, the free court waits for that game
/// to end; then all eight are free and get mixed. Entering a score wakes the matchmaker, so the wait ends
/// the moment the other court finishes, and never lasts longer than <see cref="Limit"/>.
/// </summary>
public static class MixHold
{
    public static readonly TimeSpan Limit = TimeSpan.FromMinutes(10);

    public static bool ShouldWait(PlaySession session, IReadOnlyList<Guid> players, PairingHistory history, IEnumerable<Match> live, DateTimeOffset now)
    {
        if (!history.IsSameGroupAsLastGame(players)) return false;
        // Only a game already underway ends soon enough to be worth waiting for.
        if (!live.Any(m => (m.Status is MatchStatus.Playing or MatchStatus.PendingResult) && !m.PlayerIds.Any(players.Contains))) return false;
        var freeSince = players.Select(id => session.FindParticipant(id)?.WaitingSince).Where(t => t is not null).DefaultIfEmpty(now).Min()!.Value;
        return now - freeSince < Limit;
    }
}
