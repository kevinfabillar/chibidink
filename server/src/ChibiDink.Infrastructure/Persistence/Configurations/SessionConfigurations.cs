using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ChibiDink.Domain.Sessions;
using ChibiDink.Infrastructure.Identity;

namespace ChibiDink.Infrastructure.Persistence.Configurations;

internal sealed class PlaySessionConfiguration : IEntityTypeConfiguration<PlaySession>
{
    public void Configure(EntityTypeBuilder<PlaySession> b)
    {
        b.ToTable("PlaySessions");
        b.Property(s => s.Title).HasMaxLength(80).IsRequired();
        b.Property(s => s.Location).HasMaxLength(120).IsRequired();
        b.Property(s => s.InviteCode).HasMaxLength(6).IsFixedLength().IsRequired();
        b.HasIndex(s => s.InviteCode).IsUnique();
        b.HasIndex(s => s.Status);
        b.HasOne<AppUser>().WithMany().HasForeignKey(s => s.OrganizerId).OnDelete(DeleteBehavior.Restrict);

        b.ComplexProperty(s => s.Settings);

        // A handful of small groups, always read and written with the session: one JSON column.
        b.Ignore(s => s.PlannedGroups);
        b.Property<List<PlannedGroup>>("_plannedGroups")
            .HasColumnName("PlannedGroups")
            .HasConversion(PlannedGroupsJson.Converter, PlannedGroupsJson.Comparer)
            .HasDefaultValueSql("'[]'")
            .IsRequired();

        b.HasMany(s => s.Courts).WithOne().HasForeignKey(c => c.SessionId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(s => s.Participants).WithOne().HasForeignKey(p => p.SessionId).OnDelete(DeleteBehavior.Cascade);
        b.Navigation(s => s.Courts).UsePropertyAccessMode(PropertyAccessMode.Field);
        b.Navigation(s => s.Participants).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

internal static class PlannedGroupsJson
{
    public static readonly ValueConverter<List<PlannedGroup>, string> Converter = new(
        v => Write(v), v => Read(v));

    public static readonly ValueComparer<List<PlannedGroup>> Comparer = new(
        (a, b) => Write(a!) == Write(b!), v => Write(v).GetHashCode(), v => Read(Write(v)));

    private static string Write(List<PlannedGroup> groups) => JsonSerializer.Serialize(groups);

    private static List<PlannedGroup> Read(string json) =>
        string.IsNullOrWhiteSpace(json) ? [] : JsonSerializer.Deserialize<List<PlannedGroup>>(json) ?? [];
}

internal sealed class CourtConfiguration : IEntityTypeConfiguration<Court>
{
    public void Configure(EntityTypeBuilder<Court> b)
    {
        b.ToTable("Courts");
        b.HasIndex(c => new { c.SessionId, c.Number }).IsUnique();
        b.Property(c => c.Id).ValueGeneratedNever();
    }
}

internal sealed class SessionParticipantConfiguration : IEntityTypeConfiguration<SessionParticipant>
{
    public void Configure(EntityTypeBuilder<SessionParticipant> b)
    {
        b.ToTable("SessionParticipants");
        b.Property(p => p.Id).ValueGeneratedNever();
        b.HasIndex(p => new { p.SessionId, p.UserId }).IsUnique();
        b.HasIndex(p => p.UserId);
        b.HasOne<AppUser>().WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
