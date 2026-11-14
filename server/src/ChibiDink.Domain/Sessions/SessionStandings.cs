namespace ChibiDink.Domain.Sessions;

/// <summary>A finished game for the standings: who won, who lost, and the score.</summary>
public sealed record GameResult(IReadOnlyList<Guid> Winners, IReadOnlyList<Guid> Losers, int WinnerScore, int LoserScore);

/// <summary>A player's session record.</summary>
public sealed record PlayerRecord(Guid UserId, int Wins, int Losses);

/// <summary>
/// A player's place in the standings. Players level on every measure share a rank (<see cref="Tied"/>).
/// <see cref="TieBreak"/> says why they're above someone with the same record, if a tiebreaker decided it.
/// </summary>
public sealed record Standing(Guid UserId, int Rank, bool Tied, string? TieBreak);

/// <summary>
/// Session standings. In order:
/// <list type="number">
/// <item>Most wins.</item>
/// <item>Best win rate.</item>
/// <item>Tougher wins with partners: winning with partners who otherwise lose counts for more than winning with
/// partners who otherwise win. Each partner's record leaves out the games they played with this player, so a player's
/// own wins don't make their partners look strong.</item>
/// <item>Stronger opponents beaten (their records also leave out games against this player).</item>
/// <item>Point difference across all games.</item>
/// <item>Still level: a shared rank.</item>
/// </list>
/// Players with no finished games aren't ranked.
/// </summary>
public static class SessionStandings
{
    public const string TougherPartners = "Won with tougher partners";
    public const string StrongerOpponents = "Beat stronger opponents";
    public const string PointDifference = "Better point difference";

    private const double Epsilon = 1e-9;

    /// <summary>Win rate assumed for someone with no other games to judge them by.</summary>
    private const double Neutral = 0.5;

    private sealed record Measures(Guid UserId, int Wins, double WinRate, double PartnerStrength, double OpponentStrength, int PointDifference);

    public static IReadOnlyList<Standing> Rank(IReadOnlyList<PlayerRecord> players, IReadOnlyList<GameResult> games)
    {
        var measured = players
            .Where(p => p.Wins + p.Losses > 0)
            .Select(p => Measure(p, games))
            .ToList();
        measured.Sort(Compare);

        var standings = new List<Standing>(measured.Count);
        for (var i = 0; i < measured.Count; i++)
        {
            var current = measured[i];
            var levelWithPrevious = i > 0 && Compare(measured[i - 1], current) == 0;
            var levelWithNext = i + 1 < measured.Count && Compare(current, measured[i + 1]) == 0;
            var rank = levelWithPrevious ? standings[i - 1].Rank : i + 1;
            // Above someone with the same record because of a tiebreaker: say which one.
            var tieBreak = i + 1 < measured.Count && !levelWithNext ? Decider(current, measured[i + 1]) : null;
            standings.Add(new Standing(current.UserId, rank, levelWithPrevious || levelWithNext, tieBreak));
        }
        return standings;
    }

    private static Measures Measure(PlayerRecord p, IReadOnlyList<GameResult> games)
    {
        var played = p.Wins + p.Losses;
        var partnerRates = new List<double>();
        var opponentRates = new List<double>();
        var pointDifference = 0;

        foreach (var game in games)
        {
            var won = game.Winners.Contains(p.UserId);
            if (!won && !game.Losers.Contains(p.UserId)) continue;
            pointDifference += won ? game.WinnerScore - game.LoserScore : game.LoserScore - game.WinnerScore;
            if (!won) continue;
            partnerRates.AddRange(game.Winners.Where(id => id != p.UserId).Select(id => RateWithout(id, p.UserId, games)));
            opponentRates.AddRange(game.Losers.Select(id => RateWithout(id, p.UserId, games)));
        }

        return new Measures(
            p.UserId,
            p.Wins,
            (double)p.Wins / played,
            partnerRates.Count > 0 ? partnerRates.Average() : Neutral,
            opponentRates.Count > 0 ? opponentRates.Average() : Neutral,
            pointDifference);
    }

    /// <summary><paramref name="playerId"/>'s win rate in games that didn't include <paramref name="without"/>.</summary>
    private static double RateWithout(Guid playerId, Guid without, IReadOnlyList<GameResult> games)
    {
        int wins = 0, total = 0;
        foreach (var game in games)
        {
            if (game.Winners.Contains(without) || game.Losers.Contains(without)) continue;
            if (game.Winners.Contains(playerId)) { wins++; total++; }
            else if (game.Losers.Contains(playerId)) total++;
        }
        return total == 0 ? Neutral : (double)wins / total;
    }

    /// <summary>Negative when <paramref name="a"/> ranks above <paramref name="b"/>; zero when level on everything.</summary>
    private static int Compare(Measures a, Measures b)
    {
        if (a.Wins != b.Wins) return b.Wins.CompareTo(a.Wins);
        if (Math.Abs(a.WinRate - b.WinRate) > Epsilon) return b.WinRate.CompareTo(a.WinRate);
        if (Math.Abs(a.PartnerStrength - b.PartnerStrength) > Epsilon) return a.PartnerStrength.CompareTo(b.PartnerStrength); // weaker partners first
        if (Math.Abs(a.OpponentStrength - b.OpponentStrength) > Epsilon) return b.OpponentStrength.CompareTo(a.OpponentStrength);
        return b.PointDifference.CompareTo(a.PointDifference);
    }

    /// <summary>Which tiebreaker put <paramref name="above"/> over <paramref name="below"/>, if their records match.</summary>
    private static string? Decider(Measures above, Measures below)
    {
        if (above.Wins != below.Wins || Math.Abs(above.WinRate - below.WinRate) > Epsilon) return null;
        if (Math.Abs(above.PartnerStrength - below.PartnerStrength) > Epsilon) return TougherPartners;
        if (Math.Abs(above.OpponentStrength - below.OpponentStrength) > Epsilon) return StrongerOpponents;
        return above.PointDifference != below.PointDifference ? PointDifference : null;
    }
}
