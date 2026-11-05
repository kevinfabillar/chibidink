using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ChibiDink.Application.Players;
using ChibiDink.Application.Sessions;
using ChibiDink.Domain.Sessions;
using ChibiDink.Domain.Players;
using ChibiDink.Infrastructure.Identity;

namespace ChibiDink.Api.Controllers;

[ApiController]
[Route("api/auth")]
[AllowAnonymous]
[EnableRateLimiting("auth")]
public sealed class AuthController(
    UserManager<AppUser> users,
    SignInManager<AppUser> signIn,
    RoleManager<IdentityRole<Guid>> roles,
    IProfileService profiles,
    ISessionQueries sessionQueries) : ControllerBase
{
    public sealed record RegisterRequest(string Email, string Password, string DisplayName, bool AcceptTerms = false);
    public sealed record LoginRequest(string Email, string Password);
    public sealed record GuestRequest(string InviteCode, string DisplayName, bool AcceptTerms = false);

    private const string TermsRequired = "Please agree to the Terms of Service and Privacy Policy to continue.";

    /// <summary>Creates an account and its starter character, then returns a bearer token.</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
    {
        var name = request.DisplayName?.Trim() ?? "";
        if (name.Length is 0 or > PlayerProfile.MaxDisplayNameLength)
        {
            ModelState.AddModelError(nameof(request.DisplayName),
                $"Display name must be 1–{PlayerProfile.MaxDisplayNameLength} characters.");
            return ValidationProblem(ModelState);
        }
        if (!request.AcceptTerms)
        {
            ModelState.AddModelError(nameof(request.AcceptTerms), TermsRequired);
            return ValidationProblem(ModelState);
        }

        var user = new AppUser
        {
            UserName = request.Email, Email = request.Email,
            TermsAcceptedAt = DateTimeOffset.UtcNow, TermsVersion = LegalTerms.Version,
        };
        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors) ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        await profiles.EnsureProfileAsync(user.Id, name, ct);
        return await IssueTokenAsync(user);
    }

    /// <summary>
    /// Play as guest: only from a session's QR or code. Makes a guest account with just a name and
    /// returns a bearer token; the app then joins (checks in to) that session with it.
    /// </summary>
    [HttpPost("guest")]
    public async Task<IActionResult> Guest(GuestRequest request, CancellationToken ct)
    {
        var name = request.DisplayName?.Trim() ?? "";
        if (name.Length is 0 or > PlayerProfile.MaxDisplayNameLength)
        {
            ModelState.AddModelError(nameof(request.DisplayName),
                $"Name must be 1–{PlayerProfile.MaxDisplayNameLength} characters.");
            return ValidationProblem(ModelState);
        }
        if (!request.AcceptTerms)
        {
            ModelState.AddModelError(nameof(request.AcceptTerms), TermsRequired);
            return ValidationProblem(ModelState);
        }

        // The invite must exist and still be open: guests can't wander the app without a session.
        var invite = await sessionQueries.GetInvitePreviewAsync(request.InviteCode ?? "", ct);
        if (invite.Status == SessionStatus.Closed)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Session ended", detail: "This session has already ended.");

        var id = Guid.NewGuid();
        var user = new AppUser
        {
            Id = id, UserName = $"guest-{id:N}", Email = $"guest-{id:N}@guest.chibidink.local",
            TermsAcceptedAt = DateTimeOffset.UtcNow, TermsVersion = LegalTerms.Version,
        };
        var created = await users.CreateAsync(user); // no password: a guest signs in only through this token
        if (!created.Succeeded)
        {
            foreach (var error in created.Errors) ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }
        if (!await roles.RoleExistsAsync(AppUser.Roles.Guest))
            await roles.CreateAsync(new IdentityRole<Guid>(AppUser.Roles.Guest));
        await users.AddToRoleAsync(user, AppUser.Roles.Guest);

        await profiles.EnsureProfileAsync(user.Id, name, ct);
        return await IssueTokenAsync(user);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(request.Email);
        if (user is null) return InvalidLogin();

        var check = await signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!check.Succeeded) return InvalidLogin();

        // Repairs accounts whose profile creation failed after registration.
        await profiles.EnsureProfileAsync(user.Id, user.Email!.Split('@')[0], ct);
        return await IssueTokenAsync(user);
    }

    /// <summary>Writes { accessToken, expiresIn, refreshToken } via the Identity bearer handler.</summary>
    private async Task<IActionResult> IssueTokenAsync(AppUser user)
    {
        signIn.AuthenticationScheme = IdentityConstants.BearerScheme;
        await signIn.SignInAsync(user, isPersistent: false);
        return new EmptyResult();
    }

    private IActionResult InvalidLogin() =>
        Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Sign in failed", detail: "Email or password is incorrect.");
}
