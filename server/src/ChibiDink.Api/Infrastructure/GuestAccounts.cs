using Microsoft.AspNetCore.Identity;
using ChibiDink.Infrastructure.Identity;

namespace ChibiDink.Api.Infrastructure;

/// <summary>
/// Guest accounts: a name and nothing else (no email, no password). Made when someone plays as guest from a
/// session QR, or when an organizer adds a player who has no phone. Removed by the cleanup worker 7 days after
/// they last played.
/// </summary>
public sealed class GuestAccounts(UserManager<AppUser> users, RoleManager<IdentityRole<Guid>> roles)
{
    /// <summary>Creates the account (not its profile). Returns the errors instead when it couldn't be made.</summary>
    public async Task<(AppUser? User, IEnumerable<IdentityError> Errors)> CreateAsync()
    {
        var id = Guid.NewGuid();
        var user = new AppUser
        {
            Id = id, UserName = $"guest-{id:N}", Email = $"guest-{id:N}@guest.chibidink.local", EmailConfirmed = true,
            TermsAcceptedAt = DateTimeOffset.UtcNow, TermsVersion = LegalTerms.Version,
        };
        var created = await users.CreateAsync(user); // no password: a guest signs in only through a token
        if (!created.Succeeded) return (null, created.Errors);
        if (!await roles.RoleExistsAsync(AppUser.Roles.Guest))
            await roles.CreateAsync(new IdentityRole<Guid>(AppUser.Roles.Guest));
        await users.AddToRoleAsync(user, AppUser.Roles.Guest);
        return (user, []);
    }
}
