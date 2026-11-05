using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Matches;
using ChibiDink.Domain.Matches;

namespace ChibiDink.Application.Progression;

/// <summary>
/// XP and coins for a verified real-life match. Plugged in as a new completion handler,
/// so MatchService didn't change (open/closed).
/// </summary>
public sealed class MatchRewardsHandler(
    IPlayerProfileRepository profiles,
    IRewardService rewards,
    RewardRules rules) : IMatchCompletedHandler
{
    public async Task HandleAsync(MatchOutcome outcome, CancellationToken ct)
    {
        var players = await profiles.GetManyAsync(outcome.Winners.Concat(outcome.Losers), ct);
        var sourceKey = $"match:{outcome.MatchId}";

        var everyone = outcome.Winners.Select(id => (id, won: true)).Concat(outcome.Losers.Select(id => (id, won: false)));
        foreach (var (userId, won) in everyone)
        {
            if (!players.TryGetValue(userId, out var profile)) continue;
            await rewards.GrantAsync(profile,
                experience: rules.MatchExperience + (won ? rules.WinExperience : 0),
                coins: rules.MatchCoins + (won ? rules.WinCoins : 0),
                sourceKey, won ? "Verified win" : "Verified match", ct);
        }
    }
}
