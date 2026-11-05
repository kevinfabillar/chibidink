using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Sessions;
using ChibiDink.Infrastructure.Identity;

namespace ChibiDink.Infrastructure.Persistence.Configurations;

internal sealed class MatchConfiguration : IEntityTypeConfiguration<Match>
{
    public void Configure(EntityTypeBuilder<Match> b)
    {
        b.ToTable("Matches");
        b.Property(m => m.Id).ValueGeneratedNever();
        b.HasOne<PlaySession>().WithMany().HasForeignKey(m => m.SessionId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<Court>().WithMany().HasForeignKey(m => m.CourtId).OnDelete(DeleteBehavior.Restrict);
        b.Property(m => m.CancelReason).HasMaxLength(200);
        b.Ignore(m => m.TeamA);
        b.Ignore(m => m.TeamB);
        b.Ignore(m => m.PlayerIds);

        // PostgreSQL xmin: a stale write (e.g. two people verifying at once) fails instead of double-counting.
        b.Property(m => m.Version).IsRowVersion();

        // Database backstop: one live match per court.
        b.HasIndex(m => m.CourtId).IsUnique().HasFilter("\"IsActive\"");
        b.HasIndex(m => new { m.SessionId, m.IsActive });
        b.HasIndex(m => new { m.Status, m.ConfirmationDeadline });

        b.ComplexProperty(m => m.Result, r => r.Property(x => x.Notes).HasMaxLength(280));

        b.HasMany(m => m.Participants).WithOne().HasForeignKey(p => p.MatchId).OnDelete(DeleteBehavior.Cascade);
        b.Navigation(m => m.Participants).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

internal sealed class MatchParticipantConfiguration : IEntityTypeConfiguration<MatchParticipant>
{
    public void Configure(EntityTypeBuilder<MatchParticipant> b)
    {
        b.ToTable("MatchParticipants");
        b.Property(p => p.Id).ValueGeneratedNever();
        b.HasOne<AppUser>().WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(p => new { p.MatchId, p.UserId }).IsUnique();

        // Database backstop: a player can be in at most one live match anywhere.
        b.HasIndex(p => p.UserId).IsUnique().HasFilter("\"IsActive\"");
    }
}

internal sealed class MatchEditAuditConfiguration : IEntityTypeConfiguration<MatchEditAudit>
{
    public void Configure(EntityTypeBuilder<MatchEditAudit> b)
    {
        b.ToTable("MatchEditAudits");
        b.Property(a => a.Id).ValueGeneratedNever();
        b.Property(a => a.Action).HasMaxLength(40).IsRequired();
        b.Property(a => a.Details).HasMaxLength(400).IsRequired();
        b.HasIndex(a => new { a.SessionId, a.At });
    }
}
