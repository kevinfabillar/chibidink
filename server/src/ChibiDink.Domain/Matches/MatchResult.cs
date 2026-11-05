namespace ChibiDink.Domain.Matches;

public sealed record MatchResult(
    int TeamAScore,
    int TeamBScore,
    Guid ReportedById,
    DateTimeOffset ReportedAt,
    string? Notes)
{
    public Team Winner => TeamAScore > TeamBScore ? Team.A : Team.B;
    public Guid? VerifiedById { get; init; }
    public DateTimeOffset? VerifiedAt { get; init; }
}
