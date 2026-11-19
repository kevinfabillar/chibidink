using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Matchmaking;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Matchmaking;

/// <summary>Who the matchmaker may pick right now. Shared by court filling and the "Next in queue" preview.</summary>
internal static class MatchmakingCandidates
{
    /// <param name="busy">Players in a live match anywhere (this session or another).</param>
    /// <param name="held">Players kept for a group the organizer lined up.</param>
    /// <param name="lastWon">Whether each player won their last game (Winners vs Losers); see <see cref="LastResults"/>.</param>
    public static List<QueueCandidate> Build(PlaySession session, IReadOnlySet<Guid> busy, IReadOnlySet<Guid> held,
        IReadOnlyDictionary<Guid, bool>? lastWon = null)
    {
        var free = session.WaitingPlayers().Where(p => !busy.Contains(p.UserId) && !held.Contains(p.UserId)).ToList();
        var freeIds = free.Select(p => p.UserId).ToHashSet();
        var result = new List<QueueCandidate>();
        foreach (var p in free)
        {
            var partner = p.PartnerId is { } id ? session.FindParticipant(id) : null;
            Guid? partnerId = null;
            if (partner is not null && partner.Status is ParticipantStatus.Waiting or ParticipantStatus.InMatch)
            {
                // Partner still playing or held elsewhere: wait for them. Partner checked out or left: play solo meanwhile.
                if (!freeIds.Contains(partner.UserId)) continue;
                partnerId = partner.UserId;
            }
            bool? won = lastWon is not null && lastWon.TryGetValue(p.UserId, out var w) ? w : null;
            result.Add(new QueueCandidate(p.UserId, p.SkillEstimate, p.CompletedGames, p.WaitingSince ?? p.JoinedAt, partnerId, won));
        }
        return result;
    }

    /// <summary>
    /// Winners vs Losers: whose turn it is. The opposite of the bracket of the session's most recent game (its
    /// players' results going into it); the winners' bracket when there's no game yet or it was mixed.
    /// </summary>
    public static bool WinnersBracketNext(IEnumerable<Match> sessionMatches)
    {
        var all = sessionMatches.ToList();
        var latest = all.MaxBy(m => m.CreatedAt);
        if (latest is null) return true;
        var before = all.Where(m => m.Result is not null && m.EndedAt is { } e && e <= latest.CreatedAt).OrderByDescending(m => m.EndedAt);
        var goingIn = LastResults(before);
        var bracket = WinnersBracket.Of(latest.Participants.Select(p => goingIn.TryGetValue(p.UserId, out var w) ? w : (bool?)null));
        return bracket != true;
    }

    /// <summary>Whether each player won their most recent finished game, from games listed newest first.</summary>
    public static Dictionary<Guid, bool> LastResults(IEnumerable<Match> completedNewestFirst)
    {
        var last = new Dictionary<Guid, bool>();
        foreach (var match in completedNewestFirst)
        {
            if (match.Result is null) continue;
            var winner = match.Result.Winner;
            foreach (var p in match.Participants) last.TryAdd(p.UserId, p.Team == winner);
        }
        return last;
    }
}
