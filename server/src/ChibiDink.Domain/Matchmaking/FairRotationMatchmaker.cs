using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Matchmaking;

/// <summary>
/// Fills courts one at a time. Two modes:
/// - Fair Match: equal play. Rotation decides everything; skill is ignored (partners still rotate).
/// - Skill Based: each court gets four players of the same tier (Beginner, Novice, Intermediate),
///   taking the first tier in line that has four waiting. If no tier has four, the closest mix is used
///   (marked mixed-skill) rather than leaving a court empty.
/// Within the chosen group, in this order of importance:
/// 1. Players with fewer games this session go first (equal-game rotation).
/// 2. Anyone waiting longer than the protection window jumps the line.
/// 3. The player at the front of the line is always included, so nobody is skipped forever.
/// 4. Among nearby candidates, prefer groups with balanced teams and fresh partner/opponent pairs.
/// A court is never left empty just because the best group is imperfectly balanced.
/// </summary>
public sealed class FairRotationMatchmaker(FairRotationMatchmaker.Weights? weights = null) : IMatchmakingStrategy
{
    /// <summary>How strongly each concern pulls. Rotation fairness dominates by design.</summary>
    public sealed record Weights(
        double ExtraGames = 40,
        double QueuePosition = 4,
        double SkillGap = 12,
        double OverTolerance = 25,
        double RepeatPartner = 6,
        double RepeatOpponent = 2,
        int LookAhead = 6);

    private readonly Weights _w = weights ?? new Weights();

    public IReadOnlyList<ProposedLineup> FindLineups(MatchmakingRequest request)
    {
        var needed = request.Format.PlayersPerMatch();
        var queue = QueuePriority.Order(request.Candidates, request.Now, request.WaitProtection).ToList();
        var lineups = new List<ProposedLineup>();

        var skillBased = request.Mode == Sessions.QueueMode.SkillBased;
        for (var court = 0; court < request.FreeCourts && queue.Count >= needed; court++)
        {
            var pool = skillBased ? SameTierPool(queue, needed) : null;
            var best = BestLineupAnchoredOnFront(pool ?? queue, request, needed, skillBased, mixed: skillBased && pool is null);
            lineups.Add(best);
            var used = best.TeamA.Concat(best.TeamB).ToHashSet();
            queue.RemoveAll(c => used.Contains(c.UserId));
        }
        return lineups;
    }

    /// <summary>Players of the first tier (in queue order) that has enough waiting for a full court.</summary>
    private static List<QueueCandidate>? SameTierPool(List<QueueCandidate> queue, int needed)
    {
        foreach (var tier in queue.Select(c => SkillLevel.TierOf(c.Skill)).Distinct())
        {
            var group = queue.Where(c => SkillLevel.TierOf(c.Skill) == tier).ToList();
            if (group.Count >= needed) return group;
        }
        return null;
    }

    private ProposedLineup BestLineupAnchoredOnFront(List<QueueCandidate> queue, MatchmakingRequest request, int needed, bool skillBased, bool mixed)
    {
        var anchor = queue[0];
        var window = queue.Skip(1).Take(needed - 1 + _w.LookAhead).ToList();
        var minGames = queue.Min(c => c.CompletedGames);
        var position = queue.Select((c, i) => (c.UserId, i)).ToDictionary(x => x.UserId, x => x.i);

        ProposedLineup? best = null;
        var bestCost = double.MaxValue;

        foreach (var others in Combinations(window, needed - 1))
        {
            var group = others.Prepend(anchor).ToList();
            var rotationCost = group.Sum(c => (c.CompletedGames - minGames) * _w.ExtraGames + position[c.UserId] * _w.QueuePosition);

            // A mixed group (no tier had four) prefers the smallest spread of tiers.
            var tierSpread = mixed ? group.Max(c => SkillLevel.TierOf(c.Skill)) - group.Min(c => SkillLevel.TierOf(c.Skill)) : 0;
            foreach (var (teamA, teamB) in TeamSplits(group))
            {
                var lineup = Evaluate(teamA, teamB, skillBased, mixed);
                var cost = rotationCost
                           + (skillBased ? lineup.SkillGap * _w.SkillGap : 0)
                           + tierSpread * _w.OverTolerance
                           + RepeatCost(teamA, teamB, request.History);
                if (cost < bestCost)
                {
                    bestCost = cost;
                    best = lineup;
                }
            }
        }
        return best!;
    }

    private static ProposedLineup Evaluate(List<QueueCandidate> teamA, List<QueueCandidate> teamB, bool skillBased, bool mixed)
    {
        var gap = Math.Abs(teamA.Average(c => SkillLevel.TierOf(c.Skill)) - teamB.Average(c => SkillLevel.TierOf(c.Skill)));
        return new ProposedLineup(
            teamA.Select(c => c.UserId).ToList(),
            teamB.Select(c => c.UserId).ToList(),
            Math.Round(gap, 2),
            // Only skill-based sessions care: a group of different tiers is a mixed-skill match.
            skillBased && mixed);
    }

    private double RepeatCost(List<QueueCandidate> teamA, List<QueueCandidate> teamB, PairingHistory history)
    {
        double cost = 0;
        if (teamA.Count == 2) cost += history.PartnerCount(teamA[0].UserId, teamA[1].UserId) * _w.RepeatPartner;
        if (teamB.Count == 2) cost += history.PartnerCount(teamB[0].UserId, teamB[1].UserId) * _w.RepeatPartner;
        foreach (var a in teamA)
            foreach (var b in teamB)
                cost += history.OpponentCount(a.UserId, b.UserId) * _w.RepeatOpponent;
        return cost;
    }

    /// <summary>Singles: the only split. Doubles: the three distinct ways to split four players into two pairs.</summary>
    private static IEnumerable<(List<QueueCandidate>, List<QueueCandidate>)> TeamSplits(List<QueueCandidate> g)
    {
        if (g.Count == 2)
        {
            yield return ([g[0]], [g[1]]);
            yield break;
        }
        yield return ([g[0], g[1]], [g[2], g[3]]);
        yield return ([g[0], g[2]], [g[1], g[3]]);
        yield return ([g[0], g[3]], [g[1], g[2]]);
    }

    private static IEnumerable<List<T>> Combinations<T>(IReadOnlyList<T> items, int k, int start = 0)
    {
        if (k == 0)
        {
            yield return [];
            yield break;
        }
        for (var i = start; i <= items.Count - k; i++)
            foreach (var rest in Combinations(items, k - 1, i + 1))
            {
                rest.Insert(0, items[i]);
                yield return rest;
            }
    }
}
