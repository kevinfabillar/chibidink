using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Common;
using ChibiDink.Application.Contracts;
using ChibiDink.Domain.Common;
using ChibiDink.Domain.Cosmetics;
using ChibiDink.Domain.Social;

namespace ChibiDink.Application.Social;

public interface IKudosService
{
    /// <summary>The people you played with in this session (kudos still open) with what you gave each, and what you received here.</summary>
    Task<SessionKudosDto> GetForSessionAsync(Guid sessionId, CancellationToken ct);

    /// <summary>Give a player your one kudos for this session, switch it to another kind, or take it back.</summary>
    Task ToggleAsync(Guid matchId, Guid toUserId, KudosKind kind, CancellationToken ct);

    /// <summary>The top players for one kind of kudos, by Street Cred.</summary>
    Task<IReadOnlyList<StreetCredEntryDto>> LeaderboardAsync(KudosKind kind, CancellationToken ct);

    /// <summary>Confirm your kudos for this session: once everyone has one, they become final.</summary>
    Task ConfirmAsync(Guid sessionId, CancellationToken ct);

    /// <summary>The signed-in player's kudos, anonymously (only they can see this).</summary>
    Task<MyKudosDto> GetMineAsync(CancellationToken ct);
}

public sealed class KudosService(
    IKudosRepository kudos,
    IMatchRepository matches,
    IPlayerProfileRepository profiles,
    ISessionRepository sessions,
    ICosmeticCatalog catalog,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    IClock clock) : IKudosService
{
    public async Task<SessionKudosDto> GetForSessionAsync(Guid sessionId, CancellationToken ct)
    {
        var me = currentUser.UserId;
        var now = clock.UtcNow;
        // Newest first, so each person comes with your latest game together.
        var open = (await matches.ListCompletedForUserInSessionAsync(me, sessionId, ct))
            .Where(m => m.EndedAt is { } ended && now - ended <= Kudos.Window)
            .ToList();

        var all = await kudos.ListInSessionAsync(sessionId, ct);
        var given = all.Where(k => k.FromUserId == me).ToDictionary(k => k.ToUserId);
        var received = all.Where(k => k.ToUserId == me).ToList();
        var people = await profiles.GetManyAsync(open.SelectMany(m => m.PlayerIds).Concat(all.Select(k => k.ToUserId)).Append(me), ct);

        // Confirming closes the games played up to then; players from later games can still get a kudos.
        var confirmedAt = given.Values.Max(k => k.ConfirmedAt);
        var seen = new HashSet<Guid> { me };
        var players = new List<KudosTargetDto>();
        foreach (var m in open)
        {
            var myTeam = m.TeamA.Any(p => p.UserId == me) ? m.TeamA : m.TeamB;
            foreach (var p in m.TeamA.Concat(m.TeamB).Where(p => seen.Add(p.UserId)))
                players.Add(new KudosTargetDto(
                    ViewMapper.Card(p.UserId, people), m.Id, m.CourtNumber, m.EndedAt!.Value,
                    Teammate: myTeam.Any(t => t.UserId == p.UserId),
                    Given: given.TryGetValue(p.UserId, out var k) ? k.Kind : null,
                    Locked: k?.Locked ?? false,
                    Closed: k is null && confirmedAt is { } at && m.EndedAt <= at));
        }
        // The session's board: per kind, who received it and how many times. Givers stay anonymous.
        var board = all.GroupBy(k => k.Kind)
            .OrderBy(g => g.Key)
            .Select(g => new KudosBoardGroupDto(g.Key, g.GroupBy(k => k.ToUserId)
                .Select(r => new KudosReceiverDto(ViewMapper.Card(r.Key, people), r.Count()))
                .OrderByDescending(r => r.Count).ToList()))
            .ToList();
        return new SessionKudosDto(players, Counts(received), board);
    }

    public Task ToggleAsync(Guid matchId, Guid toUserId, KudosKind kind, CancellationToken ct) =>
        unitOfWork.ExecuteAsync(async innerCt =>
        {
            var match = await matches.FindAsync(matchId, innerCt) ?? throw new NotFoundException("Match");
            var me = currentUser.UserId;
            var now = clock.UtcNow;
            // One kudos per person per session: tapping the one you gave takes it back, another switches it.
            var existing = await kudos.FindInSessionAsync(match.SessionId, me, toUserId, innerCt);
            if (existing is null)
            {
                var confirmedAt = (await kudos.ListGivenInSessionsAsync(me, [match.SessionId], innerCt)).Max(k => k.ConfirmedAt);
                if (confirmedAt is { } at && match.EndedAt <= at)
                    throw new DomainException("You've confirmed your kudos for this game, so it's closed.");
                kudos.Add(Kudos.Give(match, me, toUserId, kind, now));
            }
            else if (existing.Kind == kind)
            {
                existing.EnsureCanTakeBack(match, now);
                kudos.Remove(existing);
                return;
            }
            else
                existing.Change(match, kind, now);

            // Reaching an achievement (e.g. 50 Serves kudos) unlocks its skin right away. Earned for good:
            // taking a kudos back later doesn't take the skin away.
            var achievement = catalog.All.FirstOrDefault(i => i.Achievement?.Kind == kind);
            if (achievement?.Achievement is { } goal && await kudos.CountReceivedAsync(toUserId, kind, innerCt) + 1 >= goal.Count)
            {
                var receiver = await profiles.FindAsync(toUserId, innerCt);
                receiver?.Grant(achievement, now);
            }
        }, ct);

    public async Task<IReadOnlyList<StreetCredEntryDto>> LeaderboardAsync(KudosKind kind, CancellationToken ct)
    {
        const int Top = 50;
        var top = (await kudos.TallyForKindAsync(kind, ct))
            .Select(t => (Tally: t, Cred: Kudos.StreetCred(t.Received, t.Givers)))
            .OrderByDescending(x => x.Cred).ThenByDescending(x => x.Tally.Givers)
            .Take(Top)
            .ToList();
        var people = await profiles.GetManyAsync(top.Select(x => x.Tally.UserId), ct);
        return top.Select((x, i) => new StreetCredEntryDto(i + 1, ViewMapper.Card(x.Tally.UserId, people), x.Cred, x.Tally.Received, x.Tally.Givers)).ToList();
    }

    public async Task ConfirmAsync(Guid sessionId, CancellationToken ct)
    {
        // Nobody has to give everyone a kudos: confirming locks whatever you gave.
        await unitOfWork.ExecuteAsync(async innerCt =>
        {
            var mine = await kudos.ListGivenForUpdateAsync(currentUser.UserId, sessionId, innerCt);
            if (mine.Count == 0) throw new DomainException("Give at least one kudos before confirming.");
            foreach (var k in mine) k.Lock(clock.UtcNow);
        }, ct);
    }

    public async Task<MyKudosDto> GetMineAsync(CancellationToken ct)
    {
        var me = currentUser.UserId;
        var tallies = await kudos.TallyForUserAsync(me, ct);
        var recent = await kudos.ListReceivedAsync(me, 60, ct);
        var titles = await sessions.FindTitlesAsync(recent.Select(k => k.SessionId).Distinct().ToList(), ct);
        return new MyKudosDto(
            tallies.Sum(t => t.Received),
            Cred(tallies),
            recent.Select(k => new ReceivedKudosDto(k.Kind, titles.GetValueOrDefault(k.SessionId) ?? "A session", k.GivenAt)).ToList());
    }

    /// <summary>Totals per kind, most received first.</summary>
    public static IReadOnlyList<KudosCountDto> Counts(IEnumerable<Kudos> received) =>
        received.GroupBy(k => k.Kind).Select(g => new KudosCountDto(g.Key, g.Count())).OrderByDescending(c => c.Count).ToList();

    /// <summary>Street Cred per kind, highest first.</summary>
    public static IReadOnlyList<StreetCredDto> Cred(IEnumerable<KudosTally> tallies) =>
        tallies.Select(t => new StreetCredDto(t.Kind, t.Received, t.Givers, Kudos.StreetCred(t.Received, t.Givers)))
            .OrderByDescending(c => c.Cred).ToList();
}
