using ChibiDink.Domain.Common;
using ChibiDink.Domain.Cosmetics;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Social;

namespace ChibiDink.Tests.Domain;

public sealed class AchievementSkinTests
{
    private readonly ICosmeticCatalog _catalog = new StandardCosmeticCatalog();

    [Theory]
    [InlineData("ach-butler", KudosKind.Serves)]
    [InlineData("ach-aegis", KudosKind.Defense)]
    [InlineData("ach-racer", KudosKind.Drives)]
    [InlineData("ach-shade", KudosKind.Slices)]
    [InlineData("ach-clockwork", KudosKind.Resets)]
    [InlineData("ach-sage", KudosKind.Dinks)]
    [InlineData("ach-archer", KudosKind.Drops)]
    [InlineData("ach-volt", KudosKind.SpeedUps)]
    [InlineData("ach-titan", KudosKind.Smashes)]
    [InlineData("ach-olympian", KudosKind.GoodSport)]
    [InlineData("ach-soulbound", KudosKind.GreatPartner)]
    [InlineData("ach-cheer", KudosKind.FunToPlayWith)]
    public void Each_achievement_skin_is_a_mythic_outfit_earned_with_20_kudos_and_never_sold(string id, KudosKind kind)
    {
        var item = _catalog.Get(id);

        Assert.Equal(CosmeticSlot.Outfit, item.Slot);
        Assert.Equal(Rarity.Mythic, item.Rarity);
        Assert.Equal(new KudosAchievement(kind, 20), item.Achievement);
        Assert.False(item.IsForSale);

        var profile = PlayerProfile.Create(Guid.NewGuid(), "Kev", TestData.Now);
        profile.EarnCoins(100_000);
        Assert.Throws<DomainException>(() => profile.Purchase(item, TestData.Now)); // can't be bought
        Assert.Throws<DomainException>(() => profile.Equip(item)); // not yet earned

        profile.Grant(item, TestData.Now); // earned
        profile.Equip(item);
        Assert.True(profile.Loadout.IsEquipped(id));
    }

    [Fact]
    public void No_kind_of_kudos_has_more_than_one_achievement_skin()
    {
        var earned = _catalog.All.Where(i => i.Achievement is not null).Select(i => i.Achievement!.Kind).ToList();
        Assert.Equal(earned.Distinct().Count(), earned.Count);
    }
}
