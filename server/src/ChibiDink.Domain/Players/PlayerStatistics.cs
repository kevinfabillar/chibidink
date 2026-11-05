using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Players;

/// <summary>Lifetime verified pickleball record. Only verified real-life matches change it.</summary>
public sealed class PlayerStatistics
{
    public int SinglesWins { get; private set; }
    public int SinglesLosses { get; private set; }
    public int DoublesWins { get; private set; }
    public int DoublesLosses { get; private set; }

    public int Wins => SinglesWins + DoublesWins;
    public int Losses => SinglesLosses + DoublesLosses;
    public int MatchesPlayed => Wins + Losses;

    /// <summary>Wins / (Wins + Losses) × 100, or null when there are no decided matches.</summary>
    public double? WinRate => WinRateOf(Wins, Losses);

    public static double? WinRateOf(int wins, int losses) =>
        wins + losses == 0 ? null : Math.Round(wins * 100.0 / (wins + losses), 1);

    internal void Record(MatchFormat format, bool won)
    {
        switch (format, won)
        {
            case (MatchFormat.Singles, true): SinglesWins++; break;
            case (MatchFormat.Singles, false): SinglesLosses++; break;
            case (MatchFormat.Doubles, true): DoublesWins++; break;
            default: DoublesLosses++; break;
        }
    }
}
