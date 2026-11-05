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
    public sealed record VerifyEmailRequest(string Email, string Code);

    private const string TermsRequired = "Please agree to the Terms of Service and Privacy Policy to continue.";

    /// <summary>
    /// Step 1 of sign-up: creates the account (not usable yet) and emails a 6-digit code. The player is signed in
    /// only after verifying it (verify-email). Signing up again with an email that's still unverified just
    /// updates the name and password and sends a new code, so a mistyped first try isn't a dead end.
    /// </summary>
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

        var email = request.Email?.Trim() ?? "";
        var existing = await users.FindByEmailAsync(email);
        if (existing is { EmailConfirmed: false } && await users.HasPasswordAsync(existing))
        {
            // Same person trying again before verifying: take the new password and resend the code.
            var token = await users.GeneratePasswordResetTokenAsync(existing);
            var changed = await users.ResetPasswordAsync(existing, token, request.Password ?? "");
            if (!changed.Succeeded)
            {
                foreach (var error in changed.Errors) ModelState.AddModelError(error.Code, error.Description);
                return ValidationProblem(ModelState);
            }
            existing.TermsAcceptedAt = DateTimeOffset.UtcNow;
            existing.TermsVersion = LegalTerms.Version;
            await users.UpdateAsync(existing);
            await profiles.EnsureProfileAsync(existing.Id, name, ct);
            await SendVerificationCodeAsync(existing, ct);
            return Ok(new { verificationRequired = true });
        }

        var user = new AppUser
        {
            UserName = email, Email = email,
            TermsAcceptedAt = DateTimeOffset.UtcNow, TermsVersion = LegalTerms.Version,
        };
        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors) ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        await profiles.EnsureProfileAsync(user.Id, name, ct);
        await SendVerificationCodeAsync(user, ct);
        return Ok(new { verificationRequired = true });
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
            Id = id, UserName = $"guest-{id:N}", Email = $"guest-{id:N}@guest.chibidink.local", EmailConfirmed = true,
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
        if (check.IsNotAllowed && !user.EmailConfirmed)
        {
            // Right password, but the email isn't confirmed yet: send a code and ask for it.
            await SendVerificationCodeAsync(user, ct);
            return Problem(statusCode: StatusCodes.Status403Forbidden, title: "Verify your email",
                detail: "Confirm your email first. We just sent you a 6-digit code.");
        }
        if (!check.Succeeded) return InvalidLogin();

        // Repairs accounts whose profile creation failed after registration.
        await profiles.EnsureProfileAsync(user.Id, user.Email!.Split('@')[0], ct);
        return await IssueTokenAsync(user);
    }

    /// <summary>
    /// Step 2 of sign-up: the 6-digit code from the email confirms the address, completes the account and
    /// signs the player in. Wrong codes count toward the account's lockout, so codes can't be guessed.
    /// </summary>
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail(VerifyEmailRequest request, CancellationToken ct)
    {
        const string invalid = "That code isn't right or has expired. Check the email, or send a new code.";
        var user = string.IsNullOrWhiteSpace(request.Email) ? null : await users.FindByEmailAsync(request.Email.Trim());
        if (user is null)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Verification failed", detail: invalid);
        if (await users.IsLockedOutAsync(user))
            return Problem(statusCode: StatusCodes.Status429TooManyRequests, title: "Too many tries",
                detail: "Too many wrong codes. Wait a few minutes, then send a new code.");
        if (!user.EmailConfirmed)
        {
            var code = new string((request.Code ?? "").Where(char.IsDigit).ToArray());
            var result = await users.ConfirmEmailAsync(user, code);
            if (!result.Succeeded)
            {
                await users.AccessFailedAsync(user);
                return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Verification failed", detail: invalid);
            }
            await users.ResetAccessFailedCountAsync(user);
        }
        await profiles.EnsureProfileAsync(user.Id, user.Email!.Split('@')[0], ct);
        return await IssueTokenAsync(user);
    }

    /// <summary>Sends a fresh sign-up code (same answer whether or not the email has an unverified account).</summary>
    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification(ForgotPasswordRequest request, CancellationToken ct)
    {
        var user = string.IsNullOrWhiteSpace(request.Email) ? null : await users.FindByEmailAsync(request.Email.Trim());
        if (user is not null && !user.EmailConfirmed) await SendVerificationCodeAsync(user, ct);
        return NoContent();
    }

    private async Task SendVerificationCodeAsync(AppUser user, CancellationToken ct)
    {
        // A 6-digit code (no link), because mail services rewrite links for tracking and those can be blocked.
        var code = await users.GenerateEmailConfirmationTokenAsync(user);
        var spaced = code.Length == 6 ? $"{code[..3]} {code[3..]}" : code;
        var text = $"Your ChibiDink code is {spaced}\n\nType it in the app to finish creating your account. It works for about 10 minutes.\n\nIf you didn't sign up, you can ignore this email.";
        var html =
            "<div style=\"font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1A1D24\">" +
            "<h2 style=\"margin:0 0 12px\">Confirm your email</h2>" +
            "<p>Type this code in ChibiDink to finish creating your account:</p>" +
            $"<p style=\"font-size:36px;font-weight:bold;letter-spacing:8px;margin:20px 0;color:#070C14\">{WebUtility.HtmlEncode(spaced)}</p>" +
            "<p style=\"font-size:13px;color:#5A6474\">It works for about 10 minutes. If you didn't sign up, ignore this email.</p>" +
            "</div>";
        try
        {
            await email.SendAsync(user.Email!, $"Your ChibiDink code: {spaced}", html, text, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Could not send a sign-up code email");
        }
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

        // A successful reset also clears a lockout from too many wrong passwords, and proves the email is theirs.
        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            await users.UpdateAsync(user);
        }
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
