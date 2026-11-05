using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Players;

/// <summary>
/// The paddle character's body, face and handle. Free to change at any time.
/// Gear (themed outfits), glows and auras come from equipped cosmetics (see <see cref="Cosmetics.Loadout"/>).
/// </summary>
public sealed record Appearance
{
    public static readonly string[] BodyColors = ["#F2A65A", "#7CC6A4", "#A99BE0", "#6FA8DC", "#F28B9B", "#E8D36A", "#F7B6D2", "#EAD9C6"];
    public static readonly string[] EyeColors = ["#4A8FD9", "#2F9E5B", "#C27C0E", "#8B5CF6", "#D9465A", "#14A3A3", "#E05CA8", "#6B4A3A"];
    public static readonly string[] GripColors = ["#2E333E", "#6B4527", "#9E2B3A", "#2B4579", "#2F5D3A", "#D9D2C3"];

    public static readonly string[] EyeStyles = ["sparkle", "round", "happy", "sleepy", "star", "dot", "lashes", "wink", "heart", "fierce", "dizzy"];
    public static readonly string[] BrowStyles = ["determined", "soft", "raised", "worried", "arched", "angry", "none"];
    public static readonly string[] MouthStyles = ["smirk", "grin", "wow", "cat", "blep", "flat", "lips", "kiss", "fang", "wavy"];
    public static readonly string[] CheekStyles = ["blush", "freckles", "hearts", "shy", "none"];
    public static readonly string[] FaceMarks = ["scar", "bandage", "star", "mole", "heart", "flower", "none"];
    public static readonly string[] GripWraps = ["diagonal", "stripes", "cross", "plain"];
    public static readonly string[] HandleShapes = ["slim", "classic", "chunky"];
    public static readonly string[] EndCaps = ["round", "pommel", "ball"];

    public string BodyColor { get; init; } = BodyColors[0];
    public string EdgeColor { get; init; } = "#1F2A37";
    public string EyeStyle { get; init; } = "sparkle";
    public string EyeColor { get; init; } = EyeColors[0];
    public string BrowStyle { get; init; } = "soft";
    public string MouthStyle { get; init; } = "smirk";
    public string CheekStyle { get; init; } = "blush";
    public string FaceMark { get; init; } = "none";
    public string GripColor { get; init; } = GripColors[0];
    public string GripWrap { get; init; } = "diagonal";
    public string HandleShape { get; init; } = "classic";
    public string EndCap { get; init; } = "round";

    /// <summary>Starter look with a few deterministic variations so new players don't all look identical.</summary>
    public static Appearance StarterFor(Guid userId)
    {
        var seed = userId.GetHashCode() & int.MaxValue;
        return new Appearance
        {
            BodyColor = BodyColors[seed % BodyColors.Length],
            EyeColor = EyeColors[(seed / 7) % EyeColors.Length],
            GripColor = GripColors[(seed / 13) % GripColors.Length],
            MouthStyle = MouthStyles[(seed / 17) % 3],
        };
    }

    public Appearance Validated()
    {
        Guard.That(EyeStyles.Contains(EyeStyle), "Unknown eye style.");
        Guard.That(BrowStyles.Contains(BrowStyle), "Unknown brow style.");
        Guard.That(MouthStyles.Contains(MouthStyle), "Unknown mouth style.");
        Guard.That(CheekStyles.Contains(CheekStyle), "Unknown cheek style.");
        Guard.That(FaceMarks.Contains(FaceMark), "Unknown face mark.");
        Guard.That(GripWraps.Contains(GripWrap), "Unknown grip wrap.");
        Guard.That(HandleShapes.Contains(HandleShape), "Unknown handle shape.");
        Guard.That(EndCaps.Contains(EndCap), "Unknown end cap.");
        foreach (var color in new[] { BodyColor, EdgeColor, EyeColor, GripColor })
            Guard.That(IsHexColor(color), "Colors must be #RRGGBB values.");
        return this;
    }

    private static bool IsHexColor(string value) =>
        value.Length == 7 && value[0] == '#' && value.Skip(1).All(Uri.IsHexDigit);
}
