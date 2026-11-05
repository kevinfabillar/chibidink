using ChibiDink.Domain.Common;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Domain.Scoring;

/// <summary>Decides whether a final score is legal. New formats plug in as new implementations.</summary>
public interface IScoringRule
{
    /// <summary>Throws <see cref="DomainException"/> when the score is not a valid finished game.</summary>
    void Validate(int teamAScore, int teamBScore);
}

/// <summary>Game to N points, win by M: M = 1 is no deuce (11–10 ends it), M = 2 is deuce (11–9, 12–10, ...).</summary>
public sealed class PlayToTargetScoringRule(int pointsToWin, int winBy) : IScoringRule
{
    public static PlayToTargetScoringRule For(SessionSettings settings) => new(settings.PointsToWin, settings.WinBy);

    public void Validate(int teamAScore, int teamBScore)
    {
        if (teamAScore < 0 || teamBScore < 0) throw new DomainException("Scores can't be negative.");

        var high = Math.Max(teamAScore, teamBScore);
        var low = Math.Min(teamAScore, teamBScore);
        var margin = high - low;

        if (high < pointsToWin)
            throw new DomainException($"A game ends when a team reaches {pointsToWin}.");
        if (margin < winBy)
            throw new DomainException($"The winner must lead by at least {winBy}.");
        if (high > pointsToWin && margin != winBy)
            throw new DomainException($"Past {pointsToWin}, the game ends as soon as a team leads by {winBy}.");
    }
}
