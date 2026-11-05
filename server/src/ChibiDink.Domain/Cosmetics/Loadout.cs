namespace ChibiDink.Domain.Cosmetics;

/// <summary>What a character currently wears. Visual only.</summary>
public sealed record Loadout(string OutfitId, string PaddleId, string? EffectId, string? AuraId = null, string? BackgroundId = null)
{
    public static Loadout Starter { get; } = new(StarterItems.Outfit, StarterItems.Paddle, null);

    public bool IsEquipped(string itemId) =>
        OutfitId == itemId || PaddleId == itemId || EffectId == itemId || AuraId == itemId ||
        (BackgroundId ?? StarterItems.Background) == itemId;

    public Loadout With(CosmeticItem item) => item.Slot switch
    {
        CosmeticSlot.Outfit => this with { OutfitId = item.Id },
        CosmeticSlot.Paddle => this with { PaddleId = item.Id },
        CosmeticSlot.PaddleEffect => this with { EffectId = item.Id },
        CosmeticSlot.CharacterAura => this with { AuraId = item.Id },
        CosmeticSlot.Background => this with { BackgroundId = item.Id == StarterItems.Background ? null : item.Id },
        _ => throw new ArgumentOutOfRangeException(nameof(item)),
    };

    /// <summary>Outfit, paddle and background fall back to the starter items; effects and auras can be removed entirely.</summary>
    public Loadout Cleared(CosmeticSlot slot) => slot switch
    {
        CosmeticSlot.Outfit => this with { OutfitId = StarterItems.Outfit },
        CosmeticSlot.Paddle => this with { PaddleId = StarterItems.Paddle },
        CosmeticSlot.PaddleEffect => this with { EffectId = null },
        CosmeticSlot.CharacterAura => this with { AuraId = null },
        CosmeticSlot.Background => this with { BackgroundId = null },
        _ => throw new ArgumentOutOfRangeException(nameof(slot)),
    };
}

/// <summary>A cosmetic a player has bought or earned.</summary>
public sealed class OwnedCosmetic
{
    public string ItemId { get; private set; } = "";
    public DateTimeOffset AcquiredAt { get; private set; }

    private OwnedCosmetic() { } // EF

    internal OwnedCosmetic(string itemId, DateTimeOffset acquiredAt)
    {
        ItemId = itemId;
        AcquiredAt = acquiredAt;
    }
}
