using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Progression;
using ChibiDink.Domain.Sessions;
using ChibiDink.Domain.Social;

namespace ChibiDink.Application.Abstractions;

public interface IPlayerProfileRepository
{
    Task<PlayerProfile?> FindAsync(Guid userId, CancellationToken ct);
    Task<IReadOnlyDictionary<Guid, PlayerProfile>> GetManyAsync(IEnumerable<Guid> userIds, CancellationToken ct);
    Task<PlayerProfile?> FindByFriendCodeAsync(string code, CancellationToken ct);
    Task<bool> FriendCodeExistsAsync(string code, CancellationToken ct);
    void Add(PlayerProfile profile);
}

/// <summary>Per kind: kudos received and how many different people gave them.</summary>
public sealed record KudosTally(Guid UserId, KudosKind Kind, int Received, int Givers);

public interface IKudosRepository
{
    /// <summary>The one kudos a player gave another in a session, if any.</summary>
    Task<Kudos?> FindInSessionAsync(Guid sessionId, Guid fromUserId, Guid toUserId, CancellationToken ct);

    /// <summary>Everything a player gave in one session, tracked for changes (confirming them).</summary>
    Task<IReadOnlyList<Kudos>> ListGivenForUpdateAsync(Guid fromUserId, Guid sessionId, CancellationToken ct);

    /// <summary>Everything a player gave in these sessions (read-only).</summary>
    Task<IReadOnlyList<Kudos>> ListGivenInSessionsAsync(Guid fromUserId, IReadOnlyCollection<Guid> sessionIds, CancellationToken ct);
    Task<IReadOnlyList<Kudos>> ListReceivedInSessionAsync(Guid userId, Guid sessionId, CancellationToken ct);

    Task<int> CountReceivedAsync(Guid userId, KudosKind kind, CancellationToken ct);

    /// <summary>Every kudos given in a session, by anyone (read-only; for the session's kudos board).</summary>
    Task<IReadOnlyList<Kudos>> ListInSessionAsync(Guid sessionId, CancellationToken ct);

    /// <summary>The latest kudos a player received (read-only).</summary>
    Task<IReadOnlyList<Kudos>> ListReceivedAsync(Guid userId, int take, CancellationToken ct);

    /// <summary>One player's tallies, one per kind they've received.</summary>
    Task<IReadOnlyList<KudosTally>> TallyForUserAsync(Guid userId, CancellationToken ct);

    /// <summary>Every player's tally for one kind (for the Street Cred leaderboard).</summary>
    Task<IReadOnlyList<KudosTally>> TallyForKindAsync(KudosKind kind, CancellationToken ct);
    void Add(Kudos kudos);
    void Remove(Kudos kudos);
}

public interface IFriendshipRepository
{
    /// <summary>The row between two players (a request either way, or a friendship), if any.</summary>
    Task<Friendship?> FindBetweenAsync(Guid a, Guid b, CancellationToken ct);

    /// <summary>Every request and friendship this player is part of (read-only).</summary>
    Task<IReadOnlyList<Friendship>> ListForUserAsync(Guid userId, CancellationToken ct);

    Task<int> CountAcceptedAsync(Guid userId, CancellationToken ct);
    Task<int> CountPendingSentAsync(Guid userId, CancellationToken ct);
    Task<int> CountPendingReceivedAsync(Guid userId, CancellationToken ct);
    void Add(Friendship friendship);
    void Remove(Friendship friendship);
}

public interface ISessionRepository
{
    /// <summary>Loads the session with its courts and participants.</summary>
    Task<PlaySession?> FindAsync(Guid sessionId, CancellationToken ct);
    Task<PlaySession?> FindByInviteCodeAsync(string inviteCode, CancellationToken ct);
    Task<Guid?> FindIdByInviteCodeAsync(string inviteCode, CancellationToken ct);
    Task<bool> InviteCodeExistsAsync(string inviteCode, CancellationToken ct);
    Task<IReadOnlyList<PlaySession>> ListForUserAsync(Guid userId, int take, CancellationToken ct);
    Task<string?> FindTitleAsync(Guid sessionId, CancellationToken ct);
    Task<IReadOnlyDictionary<Guid, string>> FindTitlesAsync(IReadOnlyCollection<Guid> sessionIds, CancellationToken ct);

    /// <summary>The title of a session this organizer hosts that isn't closed yet (open or live), if any.</summary>
    Task<string?> FindUnclosedTitleForOrganizerAsync(Guid organizerId, CancellationToken ct);

    /// <summary>Another session (not closed) this player is still in (hasn't left), if any: its id, title and whether they host it.</summary>
    Task<(Guid Id, string Title, bool IsOrganizer)?> FindOtherCurrentSessionAsync(Guid userId, Guid exceptSessionId, CancellationToken ct);

    /// <summary>Sessions the background matchmaker should look at right now.</summary>
    /// <summary>Sessions with matchmaking running, and sessions with a match whose confirmation time ran out.</summary>
    Task<(IReadOnlyList<Guid> Active, IReadOnlyList<Guid> Expired)> ListNeedingAttentionAsync(DateTimeOffset now, CancellationToken ct);
    void Add(PlaySession session);
}

public interface IMatchRepository
{
    Task<Match?> FindAsync(Guid matchId, CancellationToken ct);

    /// <summary>Matches that are not completed, cancelled, or voided.</summary>
    Task<IReadOnlyList<Match>> ListLiveAsync(Guid sessionId, CancellationToken ct);

    /// <summary>Which of these players are in a live match right now, in any session.</summary>
    Task<IReadOnlySet<Guid>> FindPlayersInLiveMatchesAsync(IReadOnlyCollection<Guid> userIds, CancellationToken ct);
    Task<IReadOnlyList<Match>> ListRecentCompletedAsync(Guid sessionId, int take, CancellationToken ct);
    Task<IReadOnlyList<Match>> ListCompletedForUserAsync(Guid userId, int take, CancellationToken ct);
    Task<IReadOnlyList<Match>> ListCompletedForUserInSessionAsync(Guid userId, Guid sessionId, CancellationToken ct);

    /// <summary>Live and completed matches of a session in one round trip (read-only, for views).</summary>
    Task<IReadOnlyList<Match>> ListLiveAndCompletedInSessionAsync(Guid sessionId, CancellationToken ct);

    /// <summary>The player's one live match, if any (the database allows at most one).</summary>
    Task<Match?> FindLiveForUserAsync(Guid userId, CancellationToken ct);
    void Add(Match match);
}

public interface IAuditLog
{
    void Record(MatchEditAudit entry);
    Task<IReadOnlyList<MatchEditAudit>> ListForSessionAsync(Guid sessionId, int take, CancellationToken ct);
}

/// <summary>Append-only record of XP and coin changes.</summary>
public interface IRewardLedger
{
    Task<bool> HasEntryAsync(Guid userId, RewardCurrency currency, string sourceKey, CancellationToken ct);
    void Record(RewardTransaction entry);
}
