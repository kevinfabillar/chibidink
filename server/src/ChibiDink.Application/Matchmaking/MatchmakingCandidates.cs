using ChibiDink.Domain.Matchmaking;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Matchmaking;

/// <summary>Who the matchmaker may pick right now. Shared by court filling and the "Next in queue" preview.</summary>
internal static class MatchmakingCandidates
{
    /// <param name="busy">Players in a live match anywhere (this session or another).</param>
    /// <param name="held">Players kept for a group the organizer lined up.</param>
    public static List<QueueCandidate> Build(PlaySession session, IReadOnlySet<Guid> busy, IReadOnlySet<Guid> held)
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
            result.Add(new QueueCandidate(p.UserId, p.SkillEstimate, p.CompletedGames, p.WaitingSince ?? p.JoinedAt, partnerId));
        }
        return result;
    }
}
