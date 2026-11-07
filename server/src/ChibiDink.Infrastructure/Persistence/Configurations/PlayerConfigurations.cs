using ChibiDink.Domain.Cosmetics;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Progression;
using ChibiDink.Domain.Social;
using ChibiDink.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChibiDink.Infrastructure.Persistence.Configurations;

internal sealed class PlayerProfileConfiguration : IEntityTypeConfiguration<PlayerProfile>
{
    public void Configure(EntityTypeBuilder<PlayerProfile> b)
    {
        b.ToTable("PlayerProfiles");
        b.HasKey(p => p.UserId);
        b.HasOne<AppUser>().WithOne().HasForeignKey<PlayerProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        b.Property(p => p.DisplayName).HasMaxLength(PlayerProfile.MaxDisplayNameLength).IsRequired();
        b.Property(p => p.Version).IsRowVersion();
        b.Property(p => p.FriendCode).HasMaxLength(6).IsFixedLength();
        b.HasIndex(p => p.FriendCode).IsUnique();

        b.ComplexProperty(p => p.Appearance, a =>
        {
            foreach (var color in new[] { nameof(Appearance.BodyColor), nameof(Appearance.EdgeColor), nameof(Appearance.EyeColor), nameof(Appearance.GripColor), nameof(Appearance.EndCapColor), nameof(Appearance.ShoeColor) })
                a.Property<string>(color).HasMaxLength(7);
            foreach (var style in new[]
                     {
                         nameof(Appearance.EyeStyle), nameof(Appearance.BrowStyle), nameof(Appearance.MouthStyle), nameof(Appearance.CheekStyle),
                         nameof(Appearance.FaceMark), nameof(Appearance.GripWrap), nameof(Appearance.HandleShape), nameof(Appearance.EndCap),
                     })
                a.Property<string>(style).HasMaxLength(16);
        });

        // PlayerCustomization: what the character is wearing.
        b.ComplexProperty(p => p.Loadout, l =>
        {
            l.Property(x => x.OutfitId).HasMaxLength(40);
            l.Property(x => x.PaddleId).HasMaxLength(40);
            l.Property(x => x.EffectId).HasMaxLength(40);
            l.Property(x => x.AuraId).HasMaxLength(40);
            l.Property(x => x.BackgroundId).HasMaxLength(40);
            l.Property(x => x.NameplateId).HasMaxLength(40);
        });

        b.OwnsOne(p => p.Statistics, s =>
        {
            s.ToTable("PlayerStatistics");
            s.WithOwner().HasForeignKey("UserId");
            s.HasKey("UserId");
        });
        b.Navigation(p => p.Statistics).IsRequired();

        b.OwnsMany(p => p.Inventory, i =>
        {
            i.ToTable("PlayerInventory");
            i.WithOwner().HasForeignKey("UserId");
            i.HasKey("UserId", nameof(OwnedCosmetic.ItemId));
            i.Property(x => x.ItemId).HasMaxLength(40);
        });
        b.Navigation(p => p.Inventory).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

internal sealed class RewardTransactionConfiguration : IEntityTypeConfiguration<RewardTransaction>
{
    public void Configure(EntityTypeBuilder<RewardTransaction> b)
    {
        b.ToTable("RewardTransactions");
        b.Property(t => t.Id).ValueGeneratedNever();
        b.Property(t => t.Reason).HasMaxLength(80).IsRequired();
        b.Property(t => t.SourceKey).HasMaxLength(80).IsRequired();
        b.HasOne<AppUser>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);

        // Database backstop for idempotent rewards and one-time purchases.
        b.HasIndex(t => new { t.UserId, t.Currency, t.SourceKey }).IsUnique();
    }
}

internal sealed class FriendshipConfiguration : IEntityTypeConfiguration<Friendship>
{
    public void Configure(EntityTypeBuilder<Friendship> b)
    {
        b.ToTable("Friendships");
        b.Property(f => f.Id).ValueGeneratedNever();
        // Deleting an account removes its requests and friendships.
        b.HasOne<AppUser>().WithMany().HasForeignKey(f => f.RequesterId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<AppUser>().WithMany().HasForeignKey(f => f.AddresseeId).OnDelete(DeleteBehavior.Cascade);
        // One row per pair, whoever asked first.
        b.HasIndex(f => new { f.UserLowId, f.UserHighId }).IsUnique();
        b.HasIndex(f => f.AddresseeId);
    }
}
