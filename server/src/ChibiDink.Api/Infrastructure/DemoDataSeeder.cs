using ChibiDink.Application.Abstractions;
using ChibiDink.Domain.Common;
using ChibiDink.Domain.Cosmetics;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Sessions;
using ChibiDink.Infrastructure.Identity;
using ChibiDink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;

namespace ChibiDink.Api.Infrastructure;

/// <summary>
/// Development only: creates demo accounts and one session with everyone queued,
/// so the queue can be tried without registering nine people by hand. Runs once; the organizer's
/// outfits, auras and effects are topped up on every start so new items can be tried right away.
/// </summary>
internal sealed class DemoDataSeeder(
    UserManager<AppUser> users,
    AppDbContext db,
    ICosmeticCatalog catalog,
    IClock clock,
    ILogger<DemoDataSeeder> logger)
{
    public const string Password = "Dink1234";

    /// <summary>Stops every demo account from signing in (used outside Development, where the password is public).</summary>
    public static async Task LockDemoAccountsAsync(IServiceProvider sp)
    {
        var users = sp.GetRequiredService<UserManager<AppUser>>();
        foreach (var (email, _, _) in Accounts)
        {
            var user = await users.FindByEmailAsync(email);
            if (user is null || user.LockoutEnd == DateTimeOffset.MaxValue) continue;
            await users.SetLockoutEnabledAsync(user, true);
            await users.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);
        }
    }
    public const string InviteCode = "DINK22";

    // First entry is the organizer. Eight players fill both doubles courts.
    private static readonly (string Email, string Name, int Skill)[] Accounts =
    [
        ("organizer@chibidink.test", "Kevin", 3),
        ("mia@chibidink.test", "Mia", 2),
        ("rafa@chibidink.test", "Rafa", 3),
        ("elle@chibidink.test", "Elle", 1),
        ("lucas@chibidink.test", "Lucas", 3),
        ("nora@chibidink.test", "Nora", 2),
        ("evan@chibidink.test", "Evan", 1),
        ("zoe@chibidink.test", "Zoe", 3),
        ("max@chibidink.test", "Max", 3),
    ];

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var organizer = await users.FindByEmailAsync(Accounts[0].Email);
        if (organizer is not null)
        {
            await GiveOrganizerAllItemsAsync(organizer.Id, ct);
            return;
        }

        var now = clock.UtcNow;
        var ids = new List<Guid>();
        foreach (var (email, name, skill) in Accounts)
        {
            var user = new AppUser { UserName = email, Email = email, EmailConfirmed = true };
            var created = await users.CreateAsync(user, Password);
            if (!created.Succeeded)
                throw new InvalidOperationException($"Demo user {email}: {string.Join("; ", created.Errors.Select(e => e.Description))}");

            var profile = PlayerProfile.Create(user.Id, name, now);
            profile.SetSkillEstimate(new SkillLevel(skill));
            db.PlayerProfiles.Add(profile);
            ids.Add(user.Id);
        }

        var session = PlaySession.Create(
            ids[0], "Demo Open Play", "ChibiDink Courts", now, MatchFormat.Doubles, courtCount: 2,
            new SessionSettings(), InviteCode, new SkillLevel(Accounts[0].Skill), now);
        for (var i = 1; i < ids.Count; i++)
            session.Join(ids[i], new SkillLevel(Accounts[i].Skill), now).EnterQueue(now);
        db.PlaySessions.Add(session);

        await db.SaveChangesAsync(ct);
        await GiveOrganizerAllItemsAsync(ids[0], ct);
        logger.LogInformation("Seeded {Count} demo accounts (password {Password}) and session {Code}",
            Accounts.Length, Password, InviteCode);
    }

    /// <summary>The demo organizer owns every outfit, aura and effect, so each can be equipped without coins or levels.</summary>
    private async Task GiveOrganizerAllItemsAsync(Guid organizerId, CancellationToken ct)
    {
        var profile = await db.PlayerProfiles.FindAsync([organizerId], ct);
        if (profile is null) return;
        var now = clock.UtcNow;
        foreach (var item in catalog.All.Where(i => i.Slot != CosmeticSlot.Paddle)) // paddles are retired
            profile.Grant(item, now);
        await db.SaveChangesAsync(ct);
    }
}
