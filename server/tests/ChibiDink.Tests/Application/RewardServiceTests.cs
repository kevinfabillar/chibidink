using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Progression;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Progression;
using ChibiDink.Tests.Domain;

namespace ChibiDink.Tests.Application;

public sealed class RewardServiceTests
{
    private sealed class InMemoryLedger : IRewardLedger
    {
        public List<RewardTransaction> Entries { get; } = [];

        public Task<bool> HasEntryAsync(Guid userId, RewardCurrency currency, string sourceKey, CancellationToken ct) =>
            Task.FromResult(Entries.Any(e => e.UserId == userId && e.Currency == currency && e.SourceKey == sourceKey));

        public void Record(RewardTransaction entry) => Entries.Add(entry);
    }

    private sealed class FixedClock : IClock
    {
        public DateTimeOffset UtcNow => TestData.Now;
    }

    [Fact]
    public async Task The_same_reward_is_only_paid_once()
    {
        var ledger = new InMemoryLedger();
        var rewards = new RewardService(ledger, new FixedClock());
        var player = PlayerProfile.Create(Guid.NewGuid(), "Mia", TestData.Now);

        await rewards.GrantAsync(player, 150, 60, "match:1", "Verified win", CancellationToken.None);
        await rewards.GrantAsync(player, 150, 60, "match:1", "Verified win", CancellationToken.None);
        await rewards.GrantAsync(player, 100, 40, "match:2", "Verified match", CancellationToken.None);

        Assert.Equal(250, player.Experience);
        Assert.Equal(100, player.Coins);
        Assert.Equal(4, ledger.Entries.Count); // XP + coins for each distinct match
    }
}
