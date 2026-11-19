namespace ChibiDink.Domain.Common;

/// <summary>
/// Pickleball skill tier: 1 Beginner, 2 Intermediate, 3 Advanced. Used by skill-based queues and to
/// balance teams. Unrelated to character level.
/// </summary>
public readonly record struct SkillLevel
{
    public const int Min = 1;
    public const int Max = 3;
    public const int Default = 2;

    public int Value { get; }

    public SkillLevel(int value)
    {
        Guard.That(value is >= Min and <= Max, "Skill must be Beginner (1), Intermediate (2) or Advanced (3).");
        Value = value;
    }

    /// <summary>The tier for any stored value (older 1–5 estimates above 3 count as Advanced).</summary>
    public static int TierOf(int value) => Math.Clamp(value, Min, Max);

    public static string Name(int value) => TierOf(value) switch
    {
        1 => "Beginner",
        2 => "Intermediate",
        _ => "Advanced",
    };

    public static implicit operator int(SkillLevel skill) => skill.Value;
}
