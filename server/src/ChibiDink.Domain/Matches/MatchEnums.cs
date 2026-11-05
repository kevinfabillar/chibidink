namespace ChibiDink.Domain.Matches;

public enum MatchStatus
{
    Proposed = 1,
    AwaitingConfirmation = 2,
    Ready = 3,
    Playing = 4,
    PendingResult = 5,
    Completed = 6,
    Cancelled = 7,
    Voided = 8,
}

public enum Team
{
    A = 1,
    B = 2,
}

public enum ConfirmationStatus
{
    Pending = 1,
    Accepted = 2,
    Declined = 3,
}

public static class MatchStatusExtensions
{
    public static bool IsTerminal(this MatchStatus status) =>
        status is MatchStatus.Completed or MatchStatus.Cancelled or MatchStatus.Voided;

    /// <summary>Before the real-life game has started; the lineup may still change.</summary>
    public static bool IsPrePlay(this MatchStatus status) =>
        status is MatchStatus.Proposed or MatchStatus.AwaitingConfirmation or MatchStatus.Ready;

    public static Team Opponent(this Team team) => team == Team.A ? Team.B : Team.A;
}
