using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Sessions;

/// <summary>Organizer-tunable rules for a session.</summary>
public sealed record SessionSettings
{
    /// <summary>Fair Match (equal play) or Skill Based (grouped by tier).</summary>
    public QueueMode Mode { get; init; } = QueueMode.FairMatch;

    /// <summary>Largest acceptable gap in average team skill before a match counts as mixed-skill.</summary>
    public double SkillTolerance { get; init; } = 1.0;

    /// <summary>
    /// Seconds players have to accept a proposed match. 0 (the default) is automatic queueing:
    /// the next four go straight onto a free court (no accepting) and wait there until Start match.
    /// </summary>
    public int ConfirmationWindowSeconds { get; init; } = 0;

    /// <summary>After this many minutes waiting, a player jumps to the front regardless of games played.</summary>
    public int WaitProtectionMinutes { get; init; } = 20;

    public int PointsToWin { get; init; } = 11;
    /// <summary>1 = no deuce (first to the target wins, e.g. 11–10). 2 = deuce (play on until someone leads by 2).</summary>
    public int WinBy { get; init; } = 1;

    /// <summary>When on, the server fills free courts automatically.</summary>
    public bool AutoMatchmaking { get; init; } = true;

    /// <summary>When on, players may join with the invite code.</summary>
    public bool OpenAdmission { get; init; } = true;

    public SessionSettings Validated()
    {
        Guard.That(Enum.IsDefined(Mode), "Unknown queue mode.");
        Guard.That(SkillTolerance is >= 0 and <= 4, "Skill tolerance must be between 0 and 4.");
        Guard.That(ConfirmationWindowSeconds is 0 or (>= 30 and <= 900), "Confirmation window must be 0 or 30–900 seconds.");
        Guard.That(WaitProtectionMinutes is >= 5 and <= 120, "Wait protection must be 5–120 minutes.");
        Guard.That(PointsToWin is >= 5 and <= 25, "Points to win must be 5–25.");
        Guard.That(WinBy is 1 or 2, "Win by must be 1 or 2.");
        return this;
    }
}
