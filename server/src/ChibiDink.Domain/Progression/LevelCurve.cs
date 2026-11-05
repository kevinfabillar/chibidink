namespace ChibiDink.Domain.Progression;

/// <summary>
/// Character level from total XP. Level 1→2 takes 500 XP and each level after takes 100 more
/// (Lv2 at 500, Lv3 at 1,100, Lv5 at 2,600, Lv8 at 5,600). Character level is not pickleball skill.
/// </summary>
public static class LevelCurve
{
    public const int MaxLevel = 60;

    public static int XpToNext(int level) => 400 + 100 * level;

    public static int TotalXpFor(int level)
    {
        var total = 0;
        for (var l = 1; l < level; l++) total += XpToNext(l);
        return total;
    }

    public static int LevelFor(int totalXp)
    {
        var level = 1;
        while (level < MaxLevel && totalXp >= TotalXpFor(level + 1)) level++;
        return level;
    }
}
