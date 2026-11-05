using ChibiDink.Application.Abstractions;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Progression;

namespace ChibiDink.Application.Progression;

/// <summary>Gives XP and coins through the ledger, so the same reward is never applied twice.</summary>
public interface IRewardService
{
    /// <summary>Applies the reward once per <paramref name="sourceKey"/>; repeats are ignored.</summary>
    Task GrantAsync(PlayerProfile profile, int experience, int coins, string sourceKey, string reason, CancellationToken ct);
}

public sealed class RewardService(IRewardLedger ledger, IClock clock) : IRewardService
{
    public async Task GrantAsync(PlayerProfile profile, int experience, int coins, string sourceKey, string reason, CancellationToken ct)
    {
        if (experience > 0 && !await ledger.HasEntryAsync(profile.UserId, RewardCurrency.Experience, sourceKey, ct))
        {
            profile.GainExperience(experience);
            ledger.Record(new RewardTransaction(profile.UserId, RewardCurrency.Experience, experience, reason, sourceKey, clock.UtcNow));
        }

        if (coins > 0 && !await ledger.HasEntryAsync(profile.UserId, RewardCurrency.Coins, sourceKey, ct))
        {
            profile.EarnCoins(coins);
            ledger.Record(new RewardTransaction(profile.UserId, RewardCurrency.Coins, coins, reason, sourceKey, clock.UtcNow));
        }
    }
}
