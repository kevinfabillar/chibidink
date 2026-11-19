namespace ChibiDink.Domain.Matches;

public sealed record MatchResult(
    int TeamAScore,
    int TeamBScore,
    Guid ReportedById,
    DateTimeOffset ReportedAt,
    string? Notes)
{
    public Team Winner => TeamAScore > TeamBScore ? Team.A : Team.B;

    /// <summary>
    /// Reported with just the winner (the Won button), no score. Stored as 1–0 to the winner, which no real
    /// game can end on, so it needs no extra column; screens show who won instead of a score.
    /// </summary>
    public bool IsWinnerOnly => Math.Max(TeamAScore, TeamBScore) == 1;

    public static MatchResult WinnerOnly(Team winner, Guid reportedById, DateTimeOffset reportedAt) =>
        new(winner == Team.A ? 1 : 0, winner == Team.A ? 0 : 1, reportedById, reportedAt, null);

    /// <summary>"11–5", or "Team A won" for a winner-only result.</summary>
    public string Describe() => IsWinnerOnly ? $"Team {Winner} won" : $"{TeamAScore}–{TeamBScore}";
    public Guid? VerifiedById { get; init; }
    public DateTimeOffset? VerifiedAt { get; init; }
}
