using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Common;
using ChibiDink.Application.Contracts;
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
}

public sealed class KudosService(
    IKudosRepository kudos,
    IMatchRepository matches,
    IPlayerProfileRepository profiles,
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

        var given = (await kudos.ListGivenInSessionsAsync(me, [sessionId], ct)).ToDictionary(k => k.ToUserId, k => k.Kind);
        var received = await kudos.ListReceivedInSessionAsync(me, sessionId, ct);
        var people = await profiles.GetManyAsync(open.SelectMany(m => m.PlayerIds).Append(me), ct);

        var seen = new HashSet<Guid> { me };
        var players = new List<KudosTargetDto>();
        foreach (var m in open)
        {
            var myTeam = m.TeamA.Any(p => p.UserId == me) ? m.TeamA : m.TeamB;
            foreach (var p in m.TeamA.Concat(m.TeamB).Where(p => seen.Add(p.UserId)))
                players.Add(new KudosTargetDto(
                    ViewMapper.Card(p.UserId, people), m.Id, m.CourtNumber, m.EndedAt!.Value,
                    Teammate: myTeam.Any(t => t.UserId == p.UserId),
                    Given: given.TryGetValue(p.UserId, out var kind) ? kind : null));
        }
        return new SessionKudosDto(players, Counts(received));
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
                kudos.Add(Kudos.Give(match, me, toUserId, kind, now));
            else if (existing.Kind == kind)
            {
                Kudos.EnsureCanTakeBack(match, me, toUserId, now);
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

    /// <summary>Totals per kind, most received first.</summary>
    public static IReadOnlyList<KudosCountDto> Counts(IEnumerable<Kudos> received) =>
        received.GroupBy(k => k.Kind).Select(g => new KudosCountDto(g.Key, g.Count())).OrderByDescending(c => c.Count).ToList();

    /// <summary>Street Cred per kind, highest first.</summary>
    public static IReadOnlyList<StreetCredDto> Cred(IEnumerable<KudosTally> tallies) =>
        tallies.Select(t => new StreetCredDto(t.Kind, t.Received, t.Givers, Kudos.StreetCred(t.Received, t.Givers)))
            .OrderByDescending(c => c.Cred).ToList();
}
