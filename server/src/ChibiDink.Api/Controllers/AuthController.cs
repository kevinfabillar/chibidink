using System.Net;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ChibiDink.Application.Players;
using ChibiDink.Application.Sessions;
using ChibiDink.Domain.Sessions;
using ChibiDink.Domain.Players;
using ChibiDink.Api.Infrastructure;
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
    ISessionQueries sessionQueries,
    IEmailSender email,
    IConfiguration config,
    IWebHostEnvironment env,
    ILogger<AuthController> logger) : ControllerBase
{
    public sealed record RegisterRequest(string Email, string Password, string DisplayName, bool AcceptTerms = false);
    public sealed record LoginRequest(string Email, string Password);
    public sealed record GuestRequest(string InviteCode, string DisplayName, bool AcceptTerms = false);
    public sealed record ForgotPasswordRequest(string Email);
    public sealed record ResetPasswordRequest(string Email, string Token, string NewPassword);

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

    /// <summary>
    /// "Forgot password": emails a one-time reset link (valid 1 hour). Always gives the same answer,
    /// so nobody can use it to find out which emails have accounts.
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken ct)
    {
        var user = string.IsNullOrWhiteSpace(request.Email) ? null : await users.FindByEmailAsync(request.Email.Trim());
        // Only real accounts with a password (not guests, not the demo accounts).
        if (user is null || !await users.HasPasswordAsync(user) || user.Email!.EndsWith("@chibidink.test", StringComparison.OrdinalIgnoreCase))
            // Logged without the address, so the logs show why nothing was sent.
            logger.LogInformation("Password reset asked for an email with no password account: nothing sent");
        else
        {
            var site = PublicUrl();
            if (site is null)
            {
                logger.LogError("App:PublicUrl is not set, so password reset emails can't be sent");
                return NoContent();
            }
            var token = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(await users.GeneratePasswordResetTokenAsync(user)));
            var link = $"{site}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={token}";
            try
            {
                await email.SendAsync(user.Email!, "Reset your ChibiDink password", ResetHtml(link), ResetText(link), ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Could not send a password reset email");
            }
        }
        return NoContent();
    }

    /// <summary>Sets a new password from a reset link.</summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        const string invalid = "This reset link is invalid or has expired. Ask for a new one.";
        var user = string.IsNullOrWhiteSpace(request.Email) ? null : await users.FindByEmailAsync(request.Email.Trim());
        if (user is null || user.Email!.EndsWith("@chibidink.test", StringComparison.OrdinalIgnoreCase))
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Reset failed", detail: invalid);

        string token;
        try
        {
            token = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Token ?? ""));
        }
        catch (FormatException)
        {
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Reset failed", detail: invalid);
        }

        var result = await users.ResetPasswordAsync(user, token, request.NewPassword ?? "");
        if (!result.Succeeded)
        {
            // A wrong or used token is one message; a weak new password shows what to fix.
            if (result.Errors.Any(e => e.Code == "InvalidToken"))
                return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Reset failed", detail: invalid);
            foreach (var error in result.Errors) ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        // A successful reset also clears a lockout from too many wrong passwords.
        await users.ResetAccessFailedCountAsync(user);
        await users.SetLockoutEndDateAsync(user, null);
        return NoContent();
    }

    /// <summary>
    /// The site address for links in emails. Set App:PublicUrl on the server (never taken from the request,
    /// so a forged Host header can't send people to another site). On your PC it's the Vite dev address.
    /// </summary>
    private string? PublicUrl() =>
        (config["App:PublicUrl"] ?? (env.IsDevelopment() ? "http://localhost:5173" : null))?.TrimEnd('/');

    private static string ResetText(string link) =>
        $"Someone (hopefully you) asked to reset your ChibiDink password.\n\nSet a new password here (the link works once, for 1 hour):\n{link}\n\nIf you didn't ask, you can ignore this email. Your password stays the same.";

    private static string ResetHtml(string link)
    {
        var safe = WebUtility.HtmlEncode(link);
        return
            "<div style=\"font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1A1D24\">" +
            "<h2 style=\"margin:0 0 12px\">Reset your ChibiDink password</h2>" +
            "<p>Someone (hopefully you) asked to reset your password. Tap the button to choose a new one.</p>" +
            $"<p style=\"margin:24px 0\"><a href=\"{safe}\" style=\"background:#B7F33B;color:#070C14;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:bold\">Set a new password</a></p>" +
            // The address written out (not a link), so it can be copied if a mail service's link tracking gets blocked.
            "<p style=\"font-size:13px;color:#5A6474\">Button not working? Copy this address into your browser:<br>" +
            $"<span style=\"word-break:break-all;color:#1A1D24\">{safe}</span></p>" +
            "<p style=\"font-size:13px;color:#5A6474\">The link works once and expires in 1 hour. If you didn't ask, ignore this email: your password stays the same.</p>" +
            "</div>";
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
