using ChibiDink.Domain.Common;
using ChibiDink.Domain.Cosmetics;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Progression;

namespace ChibiDink.Tests.Domain;

public sealed class CosmeticsTests
{
    private readonly ICosmeticCatalog _catalog = new StandardCosmeticCatalog();

    private static PlayerProfile NewPlayer(int coins = 0, int xp = 0)
    {
        var p = PlayerProfile.Create(Guid.NewGuid(), "Kevin", TestData.Now);
        p.EarnCoins(coins);
        p.GainExperience(xp);
        return p;
    }

    [Fact]
    public void Backgrounds_start_on_the_locker_room_and_can_be_swapped_and_reset()
    {
        var p = NewPlayer();
        var locker = _catalog.Get(StarterItems.Background);
        Assert.True(p.Owns(locker));
        Assert.True(p.Loadout.IsEquipped(locker.Id));

        var galaxy = _catalog.Get("bg-galaxy");
        p.Grant(galaxy, TestData.Now);
        p.Equip(galaxy);
        Assert.Equal("bg-galaxy", p.Loadout.BackgroundId);
        Assert.False(p.Loadout.IsEquipped(locker.Id));

        p.Unequip(CosmeticSlot.Background);
        Assert.Null(p.Loadout.BackgroundId);
        Assert.True(p.Loadout.IsEquipped(locker.Id));
    }

    [Fact]
    public void Granted_items_can_be_equipped_at_any_level_and_cost_nothing()
    {
        var p = NewPlayer();
        var aura = _catalog.Get("aura-champion"); // level 20
        var outfit = _catalog.Get("knight-set");

        p.Grant(aura, TestData.Now);
        p.Grant(outfit, TestData.Now);
        p.Grant(outfit, TestData.Now); // granting twice is harmless
        p.Equip(aura);
        p.Equip(outfit);

        Assert.Equal(("aura-champion", "knight-set"), (p.Loadout.AuraId, p.Loadout.OutfitId));
        Assert.Equal(0, p.Coins);
        Assert.Single(p.Inventory, i => i.ItemId == "knight-set");
    }

    [Fact]
    public void New_players_own_and_wear_the_starter_kit()
    {
        var p = NewPlayer();
        Assert.Equal(Loadout.Starter, p.Loadout);
        Assert.True(p.Owns(_catalog.Get(StarterItems.Outfit)));
        Assert.True(p.Owns(_catalog.Get(StarterItems.Paddle)));
        Assert.Null(p.Loadout.EffectId);
    }

    [Fact]
    public void Buying_spends_coins_and_adds_to_inventory()
    {
        var p = NewPlayer(coins: 500);
        var polo = _catalog.Get("club-polo");

        p.Purchase(polo, TestData.Now);

        Assert.Equal(500 - polo.Price, p.Coins);
        Assert.True(p.Owns(polo));
        Assert.Throws<DomainException>(() => p.Purchase(polo, TestData.Now)); // can't buy twice
    }

    [Fact]
    public void Cannot_buy_without_enough_coins_or_level()
    {
        Assert.Throws<DomainException>(() => NewPlayer(coins: 100).Purchase(_catalog.Get("club-polo"), TestData.Now));
        Assert.Throws<DomainException>(() => NewPlayer(coins: 5000).Purchase(_catalog.Get("legend-set"), TestData.Now));
        Assert.Throws<DomainException>(() => NewPlayer(coins: 5000).Purchase(_catalog.Get(StarterItems.Paddle), TestData.Now));
    }

    [Fact]
    public void Equipping_requires_ownership_and_effects_can_be_removed()
    {
        var p = NewPlayer(coins: 500);
        var pulse = _catalog.Get("green-pulse");
        Assert.Throws<DomainException>(() => p.Equip(pulse));

        p.Purchase(pulse, TestData.Now);
        p.Equip(pulse);
        Assert.Equal("green-pulse", p.Loadout.EffectId);

        p.Unequip(CosmeticSlot.PaddleEffect);
        Assert.Null(p.Loadout.EffectId);
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(499, 1)]
    [InlineData(500, 2)]
    [InlineData(1100, 3)]
    [InlineData(5600, 8)]
    public void Level_follows_the_xp_curve(int xp, int level) => Assert.Equal(level, LevelCurve.LevelFor(xp));

    [Fact]
    public void Gaining_xp_raises_level_and_unlocks_items()
    {
        var p = NewPlayer(coins: 1000);
        var jacket = _catalog.Get("sport-jacket"); // level 2
        Assert.False(p.HasUnlocked(jacket));

        p.GainExperience(500);

        Assert.Equal(2, p.CharacterLevel);
        Assert.True(p.HasUnlocked(jacket));
    }
}
