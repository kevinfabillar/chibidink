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
                changed |= await FillAsync(session, innerCt, holdToMix: true) > 0;
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
            created = await FillAsync(session, innerCt, holdToMix: false); // the organizer asked: fill now
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

    private async Task<int> FillAsync(PlaySession session, CancellationToken ct, bool holdToMix)
    {
        session.PrunePlannedGroups();
        var freeCourts = session.FreeCourts().ToList();
        if (freeCourts.Count == 0) return 0;

        var now = clock.UtcNow;
        // Someone still playing (here or in another session) is never called to a court.
        var waiting = session.WaitingPlayers().ToList();
        var busy = await matches.FindPlayersInLiveMatchesAsync(waiting.Select(p => p.UserId).ToList(), ct);

        // The organizer's lined-up groups go first, once all four are free.
        var created = 0;
        foreach (var group in session.PlannedGroups.ToList())
        {
            if (created == freeCourts.Count) break;
            if (!session.IsPlannedGroupReady(group) || group.Players.Any(busy.Contains)) continue;
            matches.Add(Match.Propose(session, freeCourts[created], group.TeamA, group.TeamB, now, isManual: true));
            session.RemovePlannedGroupsWith(group.Players);
            created++;
        }
        if (created == freeCourts.Count) return created;

        // Players held for a lined-up group (still waiting on a teammate's game) aren't picked for another.
        var held = session.PlannedGroups.SelectMany(g => g.Players).ToHashSet();
        var history = await RecentHistoryAsync(session.Id, ct);
        var request = new MatchmakingRequest(
            session.Format,
            freeCourts.Count - created,
            MatchmakingCandidates.Build(session, busy, held),
            history,
            now,
            session.Settings.SkillTolerance,
            TimeSpan.FromMinutes(session.Settings.WaitProtectionMinutes),
            session.Settings.Mode);

        var lineups = strategy.FindLineups(request);
        var live = holdToMix ? await matches.ListLiveAsync(session.Id, ct) : [];
        var courts = new Queue<Court>(freeCourts.Skip(created));
        foreach (var lineup in lineups)
        {
            // The same four again while another court is mid-game: wait for it, so the groups can mix.
            if (holdToMix && MixHold.ShouldWait(session, [.. lineup.TeamA, .. lineup.TeamB], history, live, now)) continue;
            var match = Match.Propose(session, courts.Dequeue(), lineup.TeamA, lineup.TeamB, now,
                isManual: false, isMixedSkill: lineup.ExceedsSkillTolerance);
            matches.Add(match);
            created++;
        }
        return created;
    }

    private async Task<PairingHistory> RecentHistoryAsync(Guid sessionId, CancellationToken ct)
    {
        var history = new PairingHistory();
        foreach (var match in await matches.ListRecentCompletedAsync(sessionId, HistoryDepth, ct))
            history.AddMatch(match.TeamA.Select(p => p.UserId).ToList(), match.TeamB.Select(p => p.UserId).ToList());
        return history;
    }

}
