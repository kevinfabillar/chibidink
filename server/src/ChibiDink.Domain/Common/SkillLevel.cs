namespace ChibiDink.Domain.Common;

/// <summary>
/// Pickleball skill tier: 1 Beginner, 2 Novice, 3 Intermediate. Used by skill-based queues and to
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
        Guard.That(value is >= Min and <= Max, "Skill must be Beginner (1), Novice (2) or Intermediate (3).");
        Value = value;
    }

    /// <summary>The tier for any stored value (older 1–5 estimates above 3 count as Intermediate).</summary>
    public static int TierOf(int value) => Math.Clamp(value, Min, Max);

    public static string Name(int value) => TierOf(value) switch
    {
        1 => "Beginner",
        2 => "Novice",
        _ => "Intermediate",
    };

    public static implicit operator int(SkillLevel skill) => skill.Value;
}
