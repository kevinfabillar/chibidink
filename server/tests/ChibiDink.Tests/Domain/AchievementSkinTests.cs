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
}
