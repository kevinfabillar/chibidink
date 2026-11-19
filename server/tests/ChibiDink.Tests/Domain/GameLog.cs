using ChibiDink.Domain.Matchmaking;

namespace ChibiDink.Tests.Domain;

/// <summary>
/// Simulations: the games of a night in the order they were played. <see cref="PairingHistory"/> takes games
/// newest first (as the app loads them), so the history is rebuilt in that order each time it's needed;
/// adding games oldest first would make everyone's "last game" their first one.
/// </summary>
internal sealed class GameLog
{
    private readonly List<(IReadOnlyList<Guid> TeamA, IReadOnlyList<Guid> TeamB)> _games = [];

    public void AddMatch(IReadOnlyList<Guid> teamA, IReadOnlyList<Guid> teamB) => _games.Add((teamA, teamB));

    public static implicit operator PairingHistory(GameLog log)
    {
        var history = new PairingHistory();
        for (var i = log._games.Count - 1; i >= 0; i--) history.AddMatch(log._games[i].TeamA, log._games[i].TeamB);
        return history;
    }
}
