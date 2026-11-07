using ChibiDink.Domain.Common;
using ChibiDink.Domain.Cosmetics;
using ChibiDink.Domain.Progression;

namespace ChibiDink.Domain.Players;

/// <summary>The player-facing side of a registered user: name, character, progression, and lifetime record.</summary>
public sealed class PlayerProfile
{
    public const int MaxDisplayNameLength = 24;

    private readonly List<OwnedCosmetic> _inventory = [];

    public Guid UserId { get; private set; }
    public string DisplayName { get; private set; } = "";
    public int SkillEstimate { get; private set; } = SkillLevel.Default;
    public int CharacterLevel { get; private set; } = 1;
    public int Experience { get; private set; }
    public int Coins { get; private set; }
    public Appearance Appearance { get; private set; } = new();
    public Loadout Loadout { get; private set; } = Loadout.Starter;
    public PlayerStatistics Statistics { get; private set; } = new();
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>Short code friends type in to add this player. Given out the first time it's needed.</summary>
    public string? FriendCode { get; private set; }

    /// <summary>Optimistic concurrency token (PostgreSQL xmin): two purchases can't spend the same coins.</summary>
    public uint Version { get; private set; }

    public IReadOnlyList<OwnedCosmetic> Inventory => _inventory;

    private PlayerProfile() { } // EF

    public static PlayerProfile Create(Guid userId, string displayName, DateTimeOffset now) => new()
    {
        UserId = userId,
        DisplayName = Guard.NotBlank(displayName, "Display name", MaxDisplayNameLength),
        Appearance = Appearance.StarterFor(userId),
        CreatedAt = now,
    };

    public void Rename(string displayName) =>
        DisplayName = Guard.NotBlank(displayName, "Display name", MaxDisplayNameLength);

    public void AssignFriendCode(string code)
    {
        Guard.That(FriendCode is null, "This player already has a friend code.");
        FriendCode = Guard.NotBlank(code, "Friend code", 6);
    }

    public void SetSkillEstimate(SkillLevel skill) => SkillEstimate = skill;

    public void ChangeAppearance(Appearance appearance) => Appearance = appearance.Validated();

    public void RecordVerifiedResult(MatchFormat format, bool won) => Statistics.Record(format, won);

    // ---- Progression --------------------------------------------------------------------------

    public void GainExperience(int amount)
    {
        Guard.That(amount >= 0, "Experience can't be negative.");
        Experience += amount;
        CharacterLevel = LevelCurve.LevelFor(Experience);
    }

    public void EarnCoins(int amount)
    {
        Guard.That(amount >= 0, "Coins can't be negative.");
        Coins += amount;
    }

    // ---- Cosmetics ----------------------------------------------------------------------------

    public bool Owns(CosmeticItem item) => item.IsStarter || _inventory.Any(i => i.ItemId == item.Id);

    public bool HasUnlocked(CosmeticItem item) => CharacterLevel >= item.RequiredLevel;

    public void Purchase(CosmeticItem item, DateTimeOffset now)
    {
        Guard.That(!Owns(item), $"You already own {item.Name}.");
        Guard.That(item.IsForSale, $"{item.Name} isn't for sale.");
        Guard.That(HasUnlocked(item), $"Reach level {item.RequiredLevel} to unlock {item.Name}.");
        Guard.That(Coins >= item.Price, $"You need {item.Price - Coins} more coins for {item.Name}.");

        Coins -= item.Price;
        _inventory.Add(new OwnedCosmetic(item.Id, now));
    }

    /// <summary>Adds an item without paying for it (demo and admin gifts). Does nothing if it's already owned.</summary>
    public void Grant(CosmeticItem item, DateTimeOffset now)
    {
        if (!Owns(item)) _inventory.Add(new OwnedCosmetic(item.Id, now));
    }

    public void Equip(CosmeticItem item)
    {
        Guard.That(Owns(item), $"Get {item.Name} before equipping it.");
        Loadout = Loadout.With(item);
    }

    public void Unequip(CosmeticSlot slot) => Loadout = Loadout.Cleared(slot);
}
