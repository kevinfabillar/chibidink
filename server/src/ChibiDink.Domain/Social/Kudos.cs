using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matches;

namespace ChibiDink.Domain.Social;

/// <summary>Skills a player showed in the game (1–19) and what they were like to play with (20+).</summary>
public enum KudosKind
{
    Dinks = 1,
    Drops = 2,
    Volleys = 3,
    Serves = 4,
    Smashes = 5,
    Defense = 6,
    Drives = 7,
    Slices = 8,
    Resets = 9,
    SpeedUps = 10,

    GoodSport = 20,
    GreatPartner = 21,
    FunToPlayWith = 22,
}

/// <summary>
/// A thumbs-up from one player to another for one skill or quality, after a finished match they played
/// together (teammate or opponent). Always positive. Each player gives each person <b>one</b> kudos per
/// session (they can switch which one), within <see cref="Window"/> of a match together ending.
/// Kudos feed Street Cred: per kind, kudos received × the number of different people who gave them.
/// </summary>
public sealed class Kudos : Entity
{
    public static readonly TimeSpan Window = TimeSpan.FromHours(24);

    public Guid MatchId { get; private set; }
    public Guid SessionId { get; private set; }
    public Guid FromUserId { get; private set; }
    public Guid ToUserId { get; private set; }
    public KudosKind Kind { get; private set; }
    public DateTimeOffset GivenAt { get; private set; }

    /// <summary>Confirmed by the giver: final, can't be switched or taken back.</summary>
    public bool Locked { get; private set; }

    /// <summary>When the giver confirmed. Games that ended before this are closed for their kudos.</summary>
    public DateTimeOffset? ConfirmedAt { get; private set; }

    private Kudos() { } // EF

    public static Kudos Give(Match match, Guid from, Guid to, KudosKind kind, DateTimeOffset now)
    {
        EnsureOpen(match, from, to, now);
        Guard.That(Enum.IsDefined(kind), "Unknown kudos.");
        return new Kudos { MatchId = match.Id, SessionId = match.SessionId, FromUserId = from, ToUserId = to, Kind = kind, GivenAt = now };
    }

    /// <summary>Switch this session's kudos for the person to another kind (still one per person).</summary>
    public void Change(Match match, KudosKind kind, DateTimeOffset now)
    {
        EnsureNotLocked();
        EnsureOpen(match, FromUserId, ToUserId, now);
        Guard.That(match.SessionId == SessionId, "That match is from another session.");
        Guard.That(Enum.IsDefined(kind), "Unknown kudos.");
        MatchId = match.Id;
        Kind = kind;
        GivenAt = now;
    }

    /// <summary>Taking kudos back follows the same rules as giving them (your match, still open, not confirmed).</summary>
    public void EnsureCanTakeBack(Match match, DateTimeOffset now)
    {
        EnsureNotLocked();
        EnsureOpen(match, FromUserId, ToUserId, now);
    }

    /// <summary>The giver confirmed their kudos: no more changes.</summary>
    public void Lock(DateTimeOffset now)
    {
        Locked = true;
        ConfirmedAt ??= now;
    }

    private void EnsureNotLocked() => Guard.That(!Locked, "You've confirmed your kudos for this session, so they can't be changed.");

    private static void EnsureOpen(Match match, Guid from, Guid to, DateTimeOffset now)
    {
        Guard.That(from != to, "You can't give yourself kudos.");
        Guard.That(match.Status == MatchStatus.Completed && match.EndedAt is not null, "Kudos open once the match is finished.");
        var players = match.PlayerIds.ToHashSet();
        Guard.That(players.Contains(from), "Only players in this match can give kudos.");
        Guard.That(players.Contains(to), "That player wasn't in this match.");
        Guard.That(now - match.EndedAt!.Value <= Window, "Kudos for this match have closed (24 hours after it ended).");
    }

    /// <summary>Reclub-style Street Cred for one kind: kudos received × different people who gave them.</summary>
    public static int StreetCred(int received, int uniqueGivers) => received * uniqueGivers;
}
