using ChibiDink.Application.Abstractions;
using ChibiDink.Domain.Matches;

namespace ChibiDink.Application.Matches;

/// <summary>
/// Reacts to a verified match inside the same transaction, so each side effect happens exactly once.
/// New reactions (XP, coins, achievements) are added as new handlers without touching MatchService.
/// </summary>
public interface IMatchCompletedHandler
{
    Task HandleAsync(MatchOutcome outcome, CancellationToken ct);
}

/// <summary>Updates every participant's lifetime wins and losses.</summary>
public sealed class LifetimeStatisticsHandler(IPlayerProfileRepository profiles) : IMatchCompletedHandler
{
    public async Task HandleAsync(MatchOutcome outcome, CancellationToken ct)
    {
        var players = await profiles.GetManyAsync(outcome.Winners.Concat(outcome.Losers), ct);
        foreach (var id in outcome.Winners)
            if (players.TryGetValue(id, out var p)) p.RecordVerifiedResult(outcome.Format, won: true);
        foreach (var id in outcome.Losers)
            if (players.TryGetValue(id, out var p)) p.RecordVerifiedResult(outcome.Format, won: false);
    }
}
