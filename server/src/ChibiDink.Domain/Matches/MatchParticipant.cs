using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Matches;

public sealed class MatchParticipant : Entity
{
    public Guid MatchId { get; private set; }
    public Guid UserId { get; private set; }
    public Team Team { get; private set; }
    public ConfirmationStatus Confirmation { get; private set; } = ConfirmationStatus.Pending;

    /// <summary>
    /// True while the match is not finished. A unique database index on (UserId) where IsActive
    /// guarantees nobody is ever booked into two live matches at once.
    /// </summary>
    public bool IsActive { get; private set; } = true;

    private MatchParticipant() { } // EF

    internal MatchParticipant(Guid matchId, Guid userId, Team team)
    {
        MatchId = matchId;
        UserId = userId;
        Team = team;
    }

    internal void Accept() => Confirmation = ConfirmationStatus.Accepted;
    internal void Decline() => Confirmation = ConfirmationStatus.Declined;
    internal void ResetConfirmation() => Confirmation = ConfirmationStatus.Pending;
    internal void Deactivate() => IsActive = false;
    internal void MoveTo(Team team) => Team = team;

    /// <summary>Moves this player to another live match (a swap between courts). Same row, so they're never booked twice.</summary>
    internal void MoveToMatch(Guid matchId, Team team)
    {
        MatchId = matchId;
        Team = team;
        Confirmation = ConfirmationStatus.Accepted;
    }
}
