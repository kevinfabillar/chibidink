using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Common;
using ChibiDink.Application.Contracts;
using ChibiDink.Application.Progression;
using ChibiDink.Domain.Cosmetics;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Progression;
using ChibiDink.Domain.Social;

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
    IKudosRepository kudos,
    IRewardLedger ledger,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    IClock clock,
    RewardRules rewards) : ICosmeticsService
{
    public async Task<CosmeticsDto> GetMineAsync(CancellationToken ct)
    {
        var me = currentUser.UserId;
        var received = (await kudos.TallyForUserAsync(me, ct)).ToDictionary(t => t.Kind, t => t.Received);
        var profile = await profiles.FindAsync(me, ct) ?? throw new NotFoundException("Profile");

        // Achievement skins already earned (e.g. kudos that arrived before this check) are handed over here.
        var earned = catalog.All.Where(i => i.Achievement is { } a && !profile.Owns(i) && received.GetValueOrDefault(a.Kind) >= a.Count).ToList();
        if (earned.Count > 0)
        {
            await unitOfWork.ExecuteAsync(async innerCt =>
            {
                var fresh = await profiles.FindAsync(me, innerCt) ?? throw new NotFoundException("Profile");
                foreach (var item in earned) fresh.Grant(item, clock.UtcNow);
            }, ct);
            profile = await profiles.FindAsync(me, ct) ?? throw new NotFoundException("Profile");
        }

        // Achievement skins stay hidden (not in the shop, items or wardrobe) until they're earned.
        var items = catalog.All
            .Where(i => i.Achievement is null || profile.Owns(i))
            .Select(i => new CosmeticItemDto(
                i.Id, i.Name, i.Slot, i.Rarity, i.Price, i.RequiredLevel, i.IsStarter,
                Owned: profile.Owns(i), Equipped: profile.Loadout.IsEquipped(i.Id), Unlocked: profile.HasUnlocked(i),
                Achievement: i.Achievement is { } a ? new AchievementDto(a.Kind, a.Count, Math.Min(a.Count, received.GetValueOrDefault(a.Kind))) : null))
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
