using ChibiDink.Domain.Common;
using ChibiDink.Domain.Scoring;

namespace ChibiDink.Tests.Domain;

public sealed class ScoringRuleTests
{
    private readonly IScoringRule _rule = new PlayToTargetScoringRule(pointsToWin: 11, winBy: 2);

    [Theory]
    [InlineData(11, 0)]
    [InlineData(11, 9)]
    [InlineData(9, 11)]
    [InlineData(12, 10)]
    [InlineData(15, 13)]
    public void Accepts_finished_games(int a, int b) => _rule.Validate(a, b);

    [Theory]
    [InlineData(10, 8)]   // nobody reached 11
    [InlineData(11, 10)]  // not won by 2
    [InlineData(13, 10)]  // should have ended at 12–10 or 13–11
    [InlineData(11, 11)]
    [InlineData(-1, 11)]
    public void Rejects_impossible_games(int a, int b) =>
        Assert.Throws<DomainException>(() => _rule.Validate(a, b));
}
