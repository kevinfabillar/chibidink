using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Progression;

public enum RewardCurrency
{
    Experience = 1,
    Coins = 2,
}

/// <summary>
/// Append-only ledger line for XP and coins (purchases are negative coin lines).
/// SourceKey is unique per player and currency, so every reward or purchase happens at most once.
/// </summary>
public sealed class RewardTransaction : Entity
{
    public Guid UserId { get; private set; }
    public RewardCurrency Currency { get; private set; }
    public int Amount { get; private set; }
    public string Reason { get; private set; } = "";
    public string SourceKey { get; private set; } = "";
    public DateTimeOffset At { get; private set; }

    private RewardTransaction() { } // EF

    public RewardTransaction(Guid userId, RewardCurrency currency, int amount, string reason, string sourceKey, DateTimeOffset at)
    {
        UserId = userId;
        Currency = currency;
        Amount = amount;
        Reason = reason;
        SourceKey = sourceKey;
        At = at;
    }
}
