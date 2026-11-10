using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Cosmetics;

public interface ICosmeticCatalog
{
    IReadOnlyList<CosmeticItem> All { get; }
    CosmeticItem? Find(string itemId);
}

public static class CosmeticCatalogExtensions
{
    public static CosmeticItem Get(this ICosmeticCatalog catalog, string itemId) =>
        catalog.Find(itemId) ?? throw new DomainException("That item doesn't exist.");
}

/// <summary>Items every new character starts with.</summary>
public static class StarterItems
{
    public const string Outfit = "basic-set";
    public const string Paddle = "starter-paddle";
    public const string Background = "bg-locker";
}

/// <summary>The launch catalog. Prices are in earned coins; there is no real-money currency.</summary>
public sealed class StandardCosmeticCatalog : ICosmeticCatalog
{
    private static readonly CosmeticItem[] Items =
    [
        // Outfits: themed gear sets (hat, held item, cape). Ids are kept from the original clothing sets.
        new(StarterItems.Outfit, "Basic", CosmeticSlot.Outfit, Rarity.Common, 0, 1, IsStarter: true),
        new("club-polo", "Chef", CosmeticSlot.Outfit, Rarity.Common, 150, 1),
        new("sport-jacket", "Cowboy", CosmeticSlot.Outfit, Rarity.Uncommon, 300, 2),
        new("ace-set", "Ninja", CosmeticSlot.Outfit, Rarity.Rare, 600, 3),
        new("champion-set", "Pirate", CosmeticSlot.Outfit, Rarity.Epic, 1200, 5),
        new("knight-set", "Paddle Knight", CosmeticSlot.Outfit, Rarity.Rare, 800, 3),
        new("ranger-set", "Ranger", CosmeticSlot.Outfit, Rarity.Uncommon, 400, 2),
        new("bard-set", "Bard", CosmeticSlot.Outfit, Rarity.Uncommon, 400, 2),
        new("viking-set", "Viking", CosmeticSlot.Outfit, Rarity.Rare, 800, 4),
        new("samurai-set", "Samurai", CosmeticSlot.Outfit, Rarity.Rare, 800, 4),
        new("cleric-set", "Cleric", CosmeticSlot.Outfit, Rarity.Epic, 1200, 5),
        new("angel-set", "Angel", CosmeticSlot.Outfit, Rarity.Epic, 1500, 6),
        new("devil-set", "Demon", CosmeticSlot.Outfit, Rarity.Epic, 1500, 6),
        new("cyber-set", "Wizard", CosmeticSlot.Outfit, Rarity.Epic, 1200, 5),
        // Glam sets (each comes with its own hairstyle)
        new("idol-set", "Pop Idol", CosmeticSlot.Outfit, Rarity.Uncommon, 400, 2),
        new("fairy-set", "Fairy", CosmeticSlot.Outfit, Rarity.Rare, 800, 3),
        new("sakura-set", "Sakura", CosmeticSlot.Outfit, Rarity.Rare, 800, 4),
        new("princess-set", "Princess", CosmeticSlot.Outfit, Rarity.Epic, 1500, 6),
        // Premium skins
        new("inferno-dragon", "Inferno Dragon", CosmeticSlot.Outfit, Rarity.Mythic, 3000, 10),
        new("void-reaper", "Void Reaper", CosmeticSlot.Outfit, Rarity.Mythic, 3000, 10),
        new("legend-set", "Royal", CosmeticSlot.Outfit, Rarity.Legendary, 2000, 8),

        // Paddles: retired from the app (the character is the paddle now); kept so existing loadouts stay valid.
        new(StarterItems.Paddle, "Starter Paddle", CosmeticSlot.Paddle, Rarity.Common, 0, 1, IsStarter: true),
        new("hex-carbon", "Hex Carbon", CosmeticSlot.Paddle, Rarity.Common, 150, 1),
        new("neon-edge", "Neon Edge", CosmeticSlot.Paddle, Rarity.Uncommon, 300, 2),
        new("electric", "Electric", CosmeticSlot.Paddle, Rarity.Rare, 600, 3),
        new("solar-flare", "Solar Flare", CosmeticSlot.Paddle, Rarity.Epic, 900, 5),
        new("vortex", "Vortex", CosmeticSlot.Paddle, Rarity.Legendary, 2000, 8),

        // Paddle effects
        new("green-pulse", "Green Pulse", CosmeticSlot.PaddleEffect, Rarity.Common, 150, 1),
        new("electric-spark", "Electric", CosmeticSlot.PaddleEffect, Rarity.Uncommon, 300, 2),
        new("flame", "Flame", CosmeticSlot.PaddleEffect, Rarity.Rare, 600, 4),
        new("aqua", "Aqua", CosmeticSlot.PaddleEffect, Rarity.Epic, 1200, 6),

        // Backgrounds: the scene behind the character, from the free locker room up to premium scenes.
        new(StarterItems.Background, "Locker Room", CosmeticSlot.Background, Rarity.Common, 0, 1, IsStarter: true),
        new("bg-sunset-court", "Sunset Court", CosmeticSlot.Background, Rarity.Uncommon, 300, 2),
        new("bg-beach", "Tropical Beach", CosmeticSlot.Background, Rarity.Rare, 600, 3),
        new("bg-neon-arena", "Neon Arena", CosmeticSlot.Background, Rarity.Epic, 1200, 5),
        new("bg-galaxy", "Galaxy", CosmeticSlot.Background, Rarity.Legendary, 2000, 8),
        new("bg-dragon-lair", "Dragon's Lair", CosmeticSlot.Background, Rarity.Mythic, 3000, 10),
        new("bg-void-realm", "Void Realm", CosmeticSlot.Background, Rarity.Mythic, 3000, 10),

        // Character auras, unlocked by character level
        new("aura-green-pulse", "Green Pulse", CosmeticSlot.CharacterAura, Rarity.Uncommon, 400, 5),
        new("aura-electric", "Electric", CosmeticSlot.CharacterAura, Rarity.Rare, 800, 10),
        new("aura-flame", "Flame", CosmeticSlot.CharacterAura, Rarity.Epic, 1200, 15),
        new("aura-champion", "Champion Aura", CosmeticSlot.CharacterAura, Rarity.Epic, 1500, 20),
        new("aura-nova", "Nova Aura", CosmeticSlot.CharacterAura, Rarity.Legendary, 2000, 12),
        new("aura-celestial", "Celestial", CosmeticSlot.CharacterAura, Rarity.Legendary, 2500, 16),
        new("aura-phoenix", "Phoenix", CosmeticSlot.CharacterAura, Rarity.Legendary, 2500, 18),

        // Achievement skins: Mythic outfits you can't buy. Receiving 20 kudos of one kind unlocks one.
        new("ach-butler", "Grand Maître", CosmeticSlot.Outfit, Rarity.Mythic, 0, 1, Achievement: new(Social.KudosKind.Serves, 20)),
        new("ach-aegis", "Aegis Bastion", CosmeticSlot.Outfit, Rarity.Mythic, 0, 1, Achievement: new(Social.KudosKind.Defense, 20)),
        new("ach-racer", "F1 Champion", CosmeticSlot.Outfit, Rarity.Mythic, 0, 1, Achievement: new(Social.KudosKind.Drives, 20)),
        new("ach-shade", "Sword God", CosmeticSlot.Outfit, Rarity.Mythic, 0, 1, Achievement: new(Social.KudosKind.Slices, 20)),
        new("ach-clockwork", "Clockwork Rewind", CosmeticSlot.Outfit, Rarity.Mythic, 0, 1, Achievement: new(Social.KudosKind.Resets, 20)),

        // Name skins: shown wherever the name appears (queue, courts, standings). Plain borders at Common,
        // fully animated borders (fire, ice, lightning…) at Legendary and Mythic.
        new("name-chalk", "Chalk", CosmeticSlot.Nameplate, Rarity.Common, 300, 3),
        new("name-grass", "Grass Court", CosmeticSlot.Nameplate, Rarity.Common, 300, 3),
        new("name-ocean", "Ocean", CosmeticSlot.Nameplate, Rarity.Rare, 800, 5),
        new("name-sunset", "Sunset", CosmeticSlot.Nameplate, Rarity.Rare, 800, 5),
        new("name-amethyst", "Amethyst", CosmeticSlot.Nameplate, Rarity.Epic, 1500, 8),
        new("name-ruby", "Ruby", CosmeticSlot.Nameplate, Rarity.Epic, 1500, 8),
        new("name-neon", "Neon Pulse", CosmeticSlot.Nameplate, Rarity.Legendary, 2500, 10),
        new("name-toxic", "Toxic", CosmeticSlot.Nameplate, Rarity.Legendary, 2500, 10),
        new("name-sakura", "Sakura", CosmeticSlot.Nameplate, Rarity.Legendary, 2500, 10),
        new("name-inferno", "Inferno", CosmeticSlot.Nameplate, Rarity.Mythic, 3500, 20),
        new("name-frost", "Frostbite", CosmeticSlot.Nameplate, Rarity.Mythic, 3500, 20),
        new("name-thunder", "Thunder", CosmeticSlot.Nameplate, Rarity.Mythic, 4000, 20),
        new("name-galaxy", "Galaxy", CosmeticSlot.Nameplate, Rarity.Mythic, 4000, 20),
        new("name-gold", "Golden Crown", CosmeticSlot.Nameplate, Rarity.Mythic, 5000, 20),
    ];

    private static readonly Dictionary<string, CosmeticItem> ById = Items.ToDictionary(i => i.Id);

    public IReadOnlyList<CosmeticItem> All => Items;

    public CosmeticItem? Find(string itemId) => ById.GetValueOrDefault(itemId);
}
