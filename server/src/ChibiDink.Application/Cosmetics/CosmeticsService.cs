using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Common;
using ChibiDink.Application.Contracts;
using ChibiDink.Application.Progression;
using ChibiDink.Domain.Cosmetics;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Progression;

namespace ChibiDink.Application.Cosmetics;

/// <summary>Browsing, buying, and equipping cosmetics for the signed-in player.</summary>
public interface ICosmeticsService
{
    Task<CosmeticsDto> GetMineAsync(CancellationToken ct);
    Task PurchaseAsync(string itemId, CancellationToken ct);
    Task EquipAsync(string itemId, CancellationToken ct);
    Task UnequipAsync(CosmeticSlot slot, CancellationToken ct);
}

public sealed class CosmeticsService(
    ICosmeticCatalog catalog,
    IPlayerProfileRepository profiles,
    IRewardLedger ledger,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    IClock clock,
    RewardRules rewards) : ICosmeticsService
{
    public async Task<CosmeticsDto> GetMineAsync(CancellationToken ct)
    {
        var profile = await profiles.FindAsync(currentUser.UserId, ct) ?? throw new NotFoundException("Profile");
        var items = catalog.All
            .Select(i => new CosmeticItemDto(
                i.Id, i.Name, i.Slot, i.Rarity, i.Price, i.RequiredLevel, i.IsStarter,
                Owned: profile.Owns(i), Equipped: profile.Loadout.IsEquipped(i.Id), Unlocked: profile.HasUnlocked(i)))
            .ToList();
        return new CosmeticsDto(ProgressDto.From(profile), profile.Loadout, items, rewards);
    }

    public Task PurchaseAsync(string itemId, CancellationToken ct) =>
        WithMyProfile((profile, now) =>
        {
            var item = catalog.Get(itemId);
            profile.Purchase(item, now);
            ledger.Record(new RewardTransaction(profile.UserId, RewardCurrency.Coins, -item.Price,
                $"Bought {item.Name}", $"purchase:{item.Id}", now));
        }, ct);

    public Task EquipAsync(string itemId, CancellationToken ct) =>
        WithMyProfile((profile, _) => profile.Equip(catalog.Get(itemId)), ct);

    public Task UnequipAsync(CosmeticSlot slot, CancellationToken ct) =>
        WithMyProfile((profile, _) => profile.Unequip(slot), ct);

    private Task WithMyProfile(Action<PlayerProfile, DateTimeOffset> change, CancellationToken ct) =>
        unitOfWork.ExecuteAsync(async innerCt =>
        {
            var profile = await profiles.FindAsync(currentUser.UserId, innerCt) ?? throw new NotFoundException("Profile");
            change(profile, clock.UtcNow);
        }, ct);
}
