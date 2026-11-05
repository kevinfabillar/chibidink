using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Sessions;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Matchmaking;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Matchmaking;

public interface IMatchmakingService
{
    /// <summary>Background pass: expire stale confirmations and, if auto mode is on, fill free courts.</summary>
    Task<bool> TickAsync(Guid sessionId, CancellationToken ct);

    /// <summary>Organizer button: fill every free court now, even when auto mode is off.</summary>
    Task<int> FillCourtsNowAsync(Guid sessionId, CancellationToken ct);
}

public sealed class MatchmakingService(
    IUnitOfWork unitOfWork,
    ISessionRepository sessions,
    IMatchRepository matches,
    IMatchmakingStrategy strategy,
    ISessionNotifier notifier,
    ICurrentUser currentUser,
    IClock clock) : IMatchmakingService
{
    private const int HistoryDepth = 30;

    public async Task<bool> TickAsync(Guid sessionId, CancellationToken ct)
    {
        var changed = false;
        await unitOfWork.ExecuteSerializedAsync(sessionId, async innerCt =>
        {
            var session = await sessions.FindAsync(sessionId, innerCt);
            if (session is null || session.IsClosed) return;

            changed |= await ExpireConfirmationsAsync(session, innerCt);
            if (session.IsMatchmakingActive && session.Settings.AutoMatchmaking)
                changed |= await FillAsync(session, innerCt) > 0;
        }, ct);

        if (changed) await notifier.SessionChangedAsync(sessionId, ct);
        return changed;
    }

    public async Task<int> FillCourtsNowAsync(Guid sessionId, CancellationToken ct)
    {
        var created = 0;
        await unitOfWork.ExecuteSerializedAsync(sessionId, async innerCt =>
        {
            var session = await sessions.FindAsync(sessionId, innerCt)
                          ?? throw new Common.NotFoundException("Session");
            session.EnsureOrganizer(currentUser.UserId);
            session.EnsureStarted();
            await ExpireConfirmationsAsync(session, innerCt);
            created = await FillAsync(session, innerCt);
        }, ct);

        await notifier.SessionChangedAsync(sessionId, ct);
        return created;
    }

    private async Task<bool> ExpireConfirmationsAsync(PlaySession session, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var expired = (await matches.ListLiveAsync(session.Id, ct)).Where(m => m.IsConfirmationExpired(now)).ToList();
        foreach (var match in expired) match.ExpireConfirmation(session, now);
        return expired.Count > 0;
    }

    private async Task<int> FillAsync(PlaySession session, CancellationToken ct)
    {
        var freeCourts = session.FreeCourts().ToList();
        if (freeCourts.Count == 0) return 0;

        var now = clock.UtcNow;
        // Someone still playing (here or in another session) is never called to a court.
        var waiting = session.WaitingPlayers().ToList();
        var busy = await matches.FindPlayersInLiveMatchesAsync(waiting.Select(p => p.UserId).ToList(), ct);
        var request = new MatchmakingRequest(
            session.Format,
            freeCourts.Count,
            waiting.Where(p => !busy.Contains(p.UserId)).Select(ToCandidate).ToList(),
            await RecentHistoryAsync(session.Id, ct),
            now,
            session.Settings.SkillTolerance,
            TimeSpan.FromMinutes(session.Settings.WaitProtectionMinutes),
            session.Settings.Mode);

        var lineups = strategy.FindLineups(request);
        foreach (var (lineup, court) in lineups.Zip(freeCourts))
        {
            var match = Match.Propose(session, court, lineup.TeamA, lineup.TeamB, now,
                isManual: false, isMixedSkill: lineup.ExceedsSkillTolerance);
            matches.Add(match);
        }
        return lineups.Count;
    }

    private async Task<PairingHistory> RecentHistoryAsync(Guid sessionId, CancellationToken ct)
    {
        var history = new PairingHistory();
        foreach (var match in await matches.ListRecentCompletedAsync(sessionId, HistoryDepth, ct))
            history.AddMatch(match.TeamA.Select(p => p.UserId).ToList(), match.TeamB.Select(p => p.UserId).ToList());
        return history;
    }

    private static QueueCandidate ToCandidate(SessionParticipant p) =>
        new(p.UserId, p.SkillEstimate, p.CompletedGames, p.WaitingSince ?? p.JoinedAt);
}
