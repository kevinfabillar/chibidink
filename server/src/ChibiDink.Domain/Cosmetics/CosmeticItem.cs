namespace ChibiDink.Domain.Cosmetics;

public enum CosmeticSlot
{
    Outfit = 1,
    Paddle = 2,
    PaddleEffect = 3,
    CharacterAura = 4,
    /// <summary>The scene behind the character.</summary>
    Background = 5,
    /// <summary>A premium skin for the player's name, shown wherever the name appears (queue, courts, standings).</summary>
    Nameplate = 6,
}

public enum Rarity
{
    Common = 1,
    Uncommon = 2,
    Rare = 3,
    Epic = 4,
    Legendary = 5,
    /// <summary>Premium skins: the top tier.</summary>
    Mythic = 6,
}

/// <summary>Earned, not bought: unlocked by receiving this many kudos of one kind.</summary>
public sealed record KudosAchievement(Social.KudosKind Kind, int Count);

/// <summary>
/// A purely visual item. It never changes matchmaking, match results, or drill scores.
/// How an item looks is a client concern; the server only knows the rules (price, level, ownership).
/// </summary>
public sealed record CosmeticItem(
    string Id,
    string Name,
    CosmeticSlot Slot,
    Rarity Rarity,
    int Price,
    int RequiredLevel,
    bool IsStarter = false,
    KudosAchievement? Achievement = null)
{
    public bool IsForSale => !IsStarter && Achievement is null && Price > 0;
}
