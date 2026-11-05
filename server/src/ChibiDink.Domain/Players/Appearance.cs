using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Players;

/// <summary>
/// The paddle character's body, face and handle. Free to change at any time.
/// Gear (themed outfits), glows and auras come from equipped cosmetics (see <see cref="Cosmetics.Loadout"/>).
/// </summary>
public sealed record Appearance
{
    public static readonly string[] BodyColors = ["#F2A65A", "#7CC6A4", "#A99BE0", "#6FA8DC", "#F28B9B", "#E8D36A", "#F7B6D2", "#EAD9C6", "#3A3F4B", "#2B3A55", "#4B2E83", "#2F5D3A", "#7A1F33", "#6B4527", "#1E1F24", "#F4F1EA"];
    public static readonly string[] EyeColors = ["#4A8FD9", "#2F9E5B", "#C27C0E", "#8B5CF6", "#D9465A", "#14A3A3", "#E05CA8", "#6B4A3A", "#1E1820", "#2B3A55", "#3B2A78", "#5A381F", "#7A1F24", "#9AA3B2"];
    public static readonly string[] GripColors = ["#2E333E", "#6B4527", "#9E2B3A", "#2B4579", "#2F5D3A", "#D9D2C3", "#0B0D12", "#4B2E83", "#F2A65A", "#B7F33B", "#FF5CA8", "#7A1F24"];

    public static readonly string[] EyeStyles = ["sparkle", "round", "happy", "sleepy", "star", "dot", "lashes", "wink", "heart", "fierce", "dizzy"];
    public static readonly string[] BrowStyles = ["determined", "soft", "raised", "worried", "arched", "angry", "none"];
    public static readonly string[] MouthStyles = ["smirk", "grin", "wow", "cat", "blep", "flat", "lips", "kiss", "fang", "wavy"];
    public static readonly string[] CheekStyles = ["blush", "freckles", "hearts", "shy", "none"];
    public static readonly string[] FaceMarks = ["scar", "bandage", "star", "mole", "heart", "flower", "none"];
    public static readonly string[] GripWraps = ["diagonal", "stripes", "cross", "zigzag", "dots", "checker", "bands", "racing", "spiral", "plain"];
    public static readonly string[] HandleShapes = ["slim", "classic", "chunky"];
    public static readonly string[] EndCaps = ["round", "pommel", "ball", "flat", "ring", "gem", "star"];
    public static readonly string[] ShoeColors = ["#F4F6F9", "#1A1D24", "#D93A45", "#2B4579", "#B7F33B", "#FF5CA8", "#8B5CF6", "#F2A65A", "#7A4A22", "#D9AE4A"];
    public static readonly string[] EndCapColors = ["#1A1D24", "#D9AE4A", "#C9D1DC", "#D93A45", "#2B4579", "#2F9E5B", "#8B5CF6", "#FF5CA8", "#B7F33B", "#F4F6F9"];

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
    public string EndCapColor { get; init; } = EndCapColors[0];

    /// <summary>Empty = the outfit's own shoes.</summary>
    public string ShoeColor { get; init; } = "";

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
        Guard.That(EndCapColors.Contains(EndCapColor), "Unknown end cap color.");
        Guard.That(ShoeColor is "" || ShoeColors.Contains(ShoeColor), "Unknown shoe color.");
        foreach (var color in new[] { BodyColor, EdgeColor, EyeColor, GripColor })
            Guard.That(IsHexColor(color), "Colors must be #RRGGBB values.");
        return this;
    }

    private static bool IsHexColor(string value) =>
        value.Length == 7 && value[0] == '#' && value.Skip(1).All(Uri.IsHexDigit);
}
