using Microsoft.AspNetCore.Identity;

namespace ChibiDink.Infrastructure.Identity;

/// <summary>Login account. Everything player-facing lives on PlayerProfile.</summary>
public sealed class AppUser : IdentityUser<Guid>
{
    public static class Roles
    {
        public const string Administrator = "Administrator";

        /// <summary>Quick guest accounts made from a session QR: they can join sessions, not host them.</summary>
        public const string Guest = "Guest";
    }

    /// <summary>When this person agreed to the Terms of Service and Privacy Policy (null for accounts made before they existed).</summary>
    public DateTimeOffset? TermsAcceptedAt { get; set; }

    /// <summary>Which version they agreed to (see <see cref="LegalTerms.Version"/>).</summary>
    [System.ComponentModel.DataAnnotations.MaxLength(20)]
    public string? TermsVersion { get; set; }
}

/// <summary>The current Terms of Service and Privacy Policy. Bump the version when either changes materially.</summary>
public static class LegalTerms
{
    public const string Version = "2026-11-05";
}
