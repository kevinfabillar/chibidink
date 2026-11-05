namespace ChibiDink.Domain.Common;

public enum MatchFormat
{
    Singles = 1,
    Doubles = 2,
}

public static class MatchFormatExtensions
{
    public static int PlayersPerTeam(this MatchFormat format) => format == MatchFormat.Singles ? 1 : 2;
    public static int PlayersPerMatch(this MatchFormat format) => format.PlayersPerTeam() * 2;
}
