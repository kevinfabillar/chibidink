using Microsoft.EntityFrameworkCore;
using ChibiDink.Application.Abstractions;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Progression;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Infrastructure.Persistence;

internal sealed class PlayerProfileRepository(AppDbContext db) : IPlayerProfileRepository
{
    public Task<PlayerProfile?> FindAsync(Guid userId, CancellationToken ct) =>
        db.PlayerProfiles.FirstOrDefaultAsync(p => p.UserId == userId, ct);

    public async Task<IReadOnlyDictionary<Guid, PlayerProfile>> GetManyAsync(IEnumerable<Guid> userIds, CancellationToken ct)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<Guid, PlayerProfile>();
        return await db.PlayerProfiles.Where(p => ids.Contains(p.UserId)).ToDictionaryAsync(p => p.UserId, ct);
    }

    public void Add(PlayerProfile profile) => db.PlayerProfiles.Add(profile);
}

internal sealed class SessionRepository(AppDbContext db) : ISessionRepository
{
    /// <summary>
    /// A session with its courts and players in one round trip. Sessions are small (≤ 6 courts, a few dozen
    /// players), so one joined query beats split queries, which cost a database round trip each — and on a
    /// hosted database every round trip is noticeable.
    /// </summary>
    private IQueryable<PlaySession> WithChildren =>
        db.PlaySessions.Include(s => s.Courts).Include(s => s.Participants).AsSingleQuery();

    public Task<PlaySession?> FindAsync(Guid sessionId, CancellationToken ct) =>
        WithChildren.FirstOrDefaultAsync(s => s.Id == sessionId, ct);

    public Task<PlaySession?> FindByInviteCodeAsync(string inviteCode, CancellationToken ct) =>
        WithChildren.FirstOrDefaultAsync(s => s.InviteCode == inviteCode, ct);

    public Task<Guid?> FindIdByInviteCodeAsync(string inviteCode, CancellationToken ct) =>
        db.PlaySessions.Where(s => s.InviteCode == inviteCode).Select(s => (Guid?)s.Id).FirstOrDefaultAsync(ct);

    public Task<string?> FindTitleAsync(Guid sessionId, CancellationToken ct) =>
        db.PlaySessions.Where(s => s.Id == sessionId).Select(s => s.Title).FirstOrDefaultAsync(ct);

    public Task<string?> FindUnclosedTitleForOrganizerAsync(Guid organizerId, CancellationToken ct) =>
        db.PlaySessions.Where(s => s.OrganizerId == organizerId && s.Status != SessionStatus.Closed)
            .OrderByDescending(s => s.CreatedAt).Select(s => s.Title).FirstOrDefaultAsync(ct);

    public async Task<(Guid Id, string Title, bool IsOrganizer)?> FindOtherCurrentSessionAsync(Guid userId, Guid exceptSessionId, CancellationToken ct)
    {
        var found = await db.PlaySessions
            .Where(s => s.Id != exceptSessionId && s.Status != SessionStatus.Closed &&
                        s.Participants.Any(p => p.UserId == userId && p.Status != ParticipantStatus.Left))
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new { s.Id, s.Title, s.OrganizerId })
            .FirstOrDefaultAsync(ct);
        return found is null ? null : (found.Id, found.Title, found.OrganizerId == userId);
    }

    public Task<bool> InviteCodeExistsAsync(string inviteCode, CancellationToken ct) =>
        db.PlaySessions.AnyAsync(s => s.InviteCode == inviteCode, ct);

    public async Task<IReadOnlyList<PlaySession>> ListForUserAsync(Guid userId, int take, CancellationToken ct) =>
        await WithChildren
            .Where(s => s.Participants.Any(p => p.UserId == userId && p.Status != ParticipantStatus.Left))
            .OrderBy(s => s.Status == SessionStatus.Closed)
            .ThenByDescending(s => s.ScheduledAt)
            .Take(take)
            .ToListAsync(ct);

    public async Task<(IReadOnlyList<Guid> Active, IReadOnlyList<Guid> Expired)> ListNeedingAttentionAsync(DateTimeOffset now, CancellationToken ct)
    {
        // Ids only (a few bytes each), so checking often costs almost nothing.
        var active = await db.PlaySessions.Where(s => s.Status == SessionStatus.Active).Select(s => s.Id).ToListAsync(ct);
        var expired = await db.Matches
            .Where(m => m.Status == MatchStatus.AwaitingConfirmation && m.ConfirmationDeadline <= now)
            .Select(m => m.SessionId)
            .Distinct()
            .ToListAsync(ct);
        return (active, expired);
    }

    public void Add(PlaySession session) => db.PlaySessions.Add(session);
}

internal sealed class MatchRepository(AppDbContext db) : IMatchRepository
{
    private IQueryable<Match> WithPlayers => db.Matches.Include(m => m.Participants);

    public Task<Match?> FindAsync(Guid matchId, CancellationToken ct) =>
        WithPlayers.FirstOrDefaultAsync(m => m.Id == matchId, ct);

    public async Task<IReadOnlySet<Guid>> FindPlayersInLiveMatchesAsync(IReadOnlyCollection<Guid> userIds, CancellationToken ct)
    {
        if (userIds.Count == 0) return new HashSet<Guid>();
        var busy = await db.Matches
            .Where(m => m.IsActive)
            .SelectMany(m => m.Participants)
            .Where(p => userIds.Contains(p.UserId))
            .Select(p => p.UserId)
            .Distinct()
            .ToListAsync(ct);
        return busy.ToHashSet();
    }

    public async Task<IReadOnlyList<Match>> ListLiveAsync(Guid sessionId, CancellationToken ct) =>
        await WithPlayers.Where(m => m.SessionId == sessionId && m.IsActive).ToListAsync(ct);

    public async Task<IReadOnlyList<Match>> ListRecentCompletedAsync(Guid sessionId, int take, CancellationToken ct) =>
        await WithPlayers
            .Where(m => m.SessionId == sessionId && m.Status == MatchStatus.Completed)
            .OrderByDescending(m => m.EndedAt)
            .Take(take)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Match>> ListCompletedForUserAsync(Guid userId, int take, CancellationToken ct) =>
        await WithPlayers
            .Where(m => m.Status == MatchStatus.Completed && m.Participants.Any(p => p.UserId == userId))
            .OrderByDescending(m => m.EndedAt)
            .Take(take)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Match>> ListCompletedForUserInSessionAsync(Guid userId, Guid sessionId, CancellationToken ct) =>
        await WithPlayers
            .Where(m => m.SessionId == sessionId && m.Status == MatchStatus.Completed && m.Participants.Any(p => p.UserId == userId))
            .OrderByDescending(m => m.EndedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Match>> ListLiveAndCompletedInSessionAsync(Guid sessionId, CancellationToken ct) =>
        await WithPlayers
            .AsNoTracking()
            .Where(m => m.SessionId == sessionId && (m.IsActive || m.Status == MatchStatus.Completed))
            .OrderByDescending(m => m.EndedAt)
            .ToListAsync(ct);

    public Task<Match?> FindLiveForUserAsync(Guid userId, CancellationToken ct) =>
        WithPlayers.FirstOrDefaultAsync(m => m.IsActive && m.Participants.Any(p => p.UserId == userId && p.IsActive), ct);

    public void Add(Match match) => db.Matches.Add(match);
}

internal sealed class RewardLedger(AppDbContext db) : IRewardLedger
{
    public async Task<bool> HasEntryAsync(Guid userId, RewardCurrency currency, string sourceKey, CancellationToken ct) =>
        db.RewardTransactions.Local.Any(t => t.UserId == userId && t.Currency == currency && t.SourceKey == sourceKey)
        || await db.RewardTransactions.AnyAsync(t => t.UserId == userId && t.Currency == currency && t.SourceKey == sourceKey, ct);

    public void Record(RewardTransaction entry) => db.RewardTransactions.Add(entry);
}

internal sealed class AuditLog(AppDbContext db) : IAuditLog
{
    public void Record(MatchEditAudit entry) => db.MatchEditAudits.Add(entry);

    public async Task<IReadOnlyList<MatchEditAudit>> ListForSessionAsync(Guid sessionId, int take, CancellationToken ct) =>
        await db.MatchEditAudits.AsNoTracking()
            .Where(a => a.SessionId == sessionId)
            .OrderByDescending(a => a.At)
            .Take(take)
            .ToListAsync(ct);
}
