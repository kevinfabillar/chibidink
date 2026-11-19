using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Matchmaking;

/// <summary>
/// Fills courts one at a time. Two modes:
/// - Fair Match: equal play. Rotation decides everything; skill is ignored (partners still rotate).
/// - Skill Based: still a fair match (equal games first), but among players who are equally due, four of the
///   same level (Beginner, Intermediate, Advanced) are preferred. To keep a court one level the queue may call
///   someone with one extra game, never two; otherwise the closest mix plays (marked mixed-skill).
/// In this order of importance:
/// 1. Players with fewer games this session go first (equal-game rotation).
/// 2. Anyone waiting longer than the protection window jumps the line.
/// 3. The player at the front of the line is always included, so nobody is skipped forever.
/// 4. Among nearby candidates, prefer groups with balanced teams and fresh partner/opponent pairs.
/// A court is never left empty just because the best group is imperfectly balanced.
/// Fixed partners (both waiting) always go on together, on the same team.
/// </summary>
public sealed class FairRotationMatchmaker(FairRotationMatchmaker.Weights? weights = null) : IMatchmakingStrategy
{
    /// <summary>How strongly each concern pulls. Rotation fairness dominates by design.</summary>
    public sealed record Weights(
        double ExtraGames = 40,
        double QueuePosition = 4,
        double SkillGap = 12,
        // Skill Based: a court mixing levels costs 75, more than one extra game (40) but less than two (80). So to
        // keep a court one level the queue may call someone with one extra game, never two: games stay as even as
        // Fair Match. Each Beginner–Advanced pair on a mixed court adds 20, so a level that can't make a four of
        // its own (e.g. two Advanced) mixes with the level next to it (Intermediate) whenever they're due.
        double MixedLevels = 75,
        double LevelsApart = 20,
        // Skill Based: a level has fewer players, so partners repeat more; partner variety (repeat partners,
        // back to back) counts a quarter as much, or it would keep breaking same-level courts apart. The same
        // four twice in a row and last game's partners together stay ruled out.
        double SkillBasedVariety = 0.25,
        // Teaming up again is allowed but made rare, and rarer each time: n earlier games together costs
        // 20 × (1 + 2 + … + n), so 20, 60, 120… Fair turns (an extra game costs 40) still come first.
        double RepeatPartner = 20,
        double RepeatOpponent = 2,
        // Per pair of players who were in the same game last time: the same four twice in a row costs 6 × 30,
        // so a fresh mix wins whenever anyone else is waiting (rotation order still decides who goes first).
        double BackToBack = 30,
        // The exact same group as last game: ruled out whenever any other group can be made.
        double SameGroupAgain = 100_000,
        // Partners from last game teamed up again: ruled out whenever another team split is possible
        // (if the same four must play, they at least swap partners).
        double SamePartnerAgain = 10_000,
        // Winners vs Losers brackets take turns. Winners' bracket = won their last game, or new (no games yet).
        // A court from the bracket whose turn it is costs 0, from the other bracket 20, mixing the two 60: a bit
        // more than one extra game (40) but less than two (80). So to keep a bracket together the queue may call
        // someone with one extra game, never two: everyone stays within about a game of each other.
        double OtherBracket = 20,
        double MixedBrackets = 60,
        int LookAhead = 6);

    private readonly Weights _w = weights ?? new Weights();

    public IReadOnlyList<ProposedLineup> FindLineups(MatchmakingRequest request)
    {
        var needed = request.Format.PlayersPerMatch();
        // A fixed partner only counts when the other half is waiting too (callers drop the rest).
        var present = request.Candidates.Select(c => c.UserId).ToHashSet();
        var queue = QueuePriority.Order(
            request.Candidates.Select(c => c.PartnerId is { } p && !present.Contains(p) ? c with { PartnerId = null } : c),
            request.Now, request.WaitProtection).ToList();
        var lineups = new List<ProposedLineup>();

        var skillBased = request.Mode == Sessions.QueueMode.SkillBased;
        for (var court = 0; court < request.FreeCourts && queue.Count >= needed; court++)
        {
            // Several courts at once: the brackets take turns court by court too.
            if (court > 0 && request.WinnersVsLosers && lineups[^1].WinnersBracket is { } lastWinners)
                request = request with { WinnersBracketNext = !lastWinners };
            var best = BestLineup(queue, request, needed, skillBased);
            if (best is null) break; // only pairs and an odd one out left: nothing valid to make
            var used = best.TeamA.Concat(best.TeamB).ToHashSet();
            if (request.WinnersVsLosers)
                best = best with { WinnersBracket = WinnersBracket.Of(queue.Where(c => used.Contains(c.UserId)).Select(c => c.LastWon)) };
            lineups.Add(best);
            queue.RemoveAll(c => used.Contains(c.UserId));
        }
        return lineups;
    }

    /// <summary>
    /// The best group that includes the front of the line. If fixed pairs make that impossible (e.g. the front
    /// player is alone and only pairs are left), the next player in line anchors instead.
    /// </summary>
    private ProposedLineup? BestLineup(List<QueueCandidate> queue, MatchmakingRequest request, int needed, bool skillBased)
    {
        for (var i = 0; i < queue.Count; i++)
            if (BestLineupAnchoredOn(queue, i, request, needed, skillBased) is { } lineup)
                return lineup;
        return null;
    }

    private ProposedLineup? BestLineupAnchoredOn(List<QueueCandidate> queue, int anchorIndex, MatchmakingRequest request, int needed, bool skillBased)
    {
        var anchor = queue[anchorIndex];
        var rest = queue.Where((_, i) => i != anchorIndex).ToList();
        var window = rest.Take(needed - 1 + _w.LookAhead).ToList();
        // Skill Based: the anchor's level may be further back in line; look at as many of them too.
        if (skillBased)
            window.AddRange(rest.Skip(window.Count).Where(c => SkillLevel.TierOf(c.Skill) == SkillLevel.TierOf(anchor.Skill)).Take(needed - 1 + _w.LookAhead));
        // Someone's partner may be further back in line: bring partners of the window into it.
        foreach (var partner in rest.Skip(window.Count).Where(c => c.PartnerId is { } p && (p == anchor.UserId || window.Any(w => w.UserId == p))).ToList())
            window.Add(partner);
        var minGames = queue.Min(c => c.CompletedGames);
        var position = queue.Select((c, i) => (c.UserId, i)).ToDictionary(x => x.UserId, x => x.i);

        ProposedLineup? best = null;
        var bestCost = double.MaxValue;

        foreach (var others in Combinations(window, needed - 1))
        {
            var group = others.Prepend(anchor).ToList();
            if (!KeepsPairsTogether(group)) continue;
            var rotationCost = group.Sum(c => (c.CompletedGames - minGames) * _w.ExtraGames + position[c.UserId] * _w.QueuePosition);

            var tierSpread = group.Max(c => SkillLevel.TierOf(c.Skill)) - group.Min(c => SkillLevel.TierOf(c.Skill));
            var levelCost = !skillBased || tierSpread == 0 ? 0
                : _w.MixedLevels + _w.LevelsApart * group.Count(c => SkillLevel.TierOf(c.Skill) == SkillLevel.Min) * group.Count(c => SkillLevel.TierOf(c.Skill) == SkillLevel.Max);
            foreach (var (teamA, teamB) in TeamSplits(group))
            {
                if (!SameTeam(teamA, teamB)) continue;
                var lineup = Evaluate(teamA, teamB, skillBased && tierSpread > 0);
                var cost = rotationCost
                           + (skillBased ? lineup.SkillGap * _w.SkillGap : 0)
                           + levelCost
                           + RepeatCost(teamA, teamB, request.History, skillBased ? _w.SkillBasedVariety : 1)
                           + (request.WinnersVsLosers ? BracketCost(group, request.WinnersBracketNext) : 0);
                if (cost < bestCost)
                {
                    bestCost = cost;
                    best = lineup;
                }
            }
        }
        return best;
    }

    /// <summary>Every fixed partner in the group has their partner in it too.</summary>
    private static bool KeepsPairsTogether(List<QueueCandidate> group) =>
        group.All(c => c.PartnerId is not { } p || group.Any(o => o.UserId == p));

    /// <summary>Fixed partners are on the same team.</summary>
    private static bool SameTeam(List<QueueCandidate> teamA, List<QueueCandidate> teamB) =>
        teamA.All(c => c.PartnerId is not { } p || teamB.All(o => o.UserId != p));

    private static ProposedLineup Evaluate(List<QueueCandidate> teamA, List<QueueCandidate> teamB, bool mixedSkill)
    {
        var gap = Math.Abs(teamA.Average(c => SkillLevel.TierOf(c.Skill)) - teamB.Average(c => SkillLevel.TierOf(c.Skill)));
        return new ProposedLineup(
            teamA.Select(c => c.UserId).ToList(),
            teamB.Select(c => c.UserId).ToList(),
            Math.Round(gap, 2),
            // Only skill-based sessions care: a group of different levels is a mixed-skill match.
            mixedSkill);
    }

    /// <summary>Growing cost of teaming up again: 0, 20, 60, 120… for 0, 1, 2, 3 earlier games together.</summary>
    private double RepeatPartnerCost(int timesTogether) => _w.RepeatPartner * timesTogether * (timesTogether + 1) / 2;

    /// <summary>
    /// Winners vs Losers: 0 for a court from the bracket whose turn it is, more for the other bracket, most for a
    /// court mixing both. New players (no games yet) are in the winners' bracket: they play winners, not losers.
    /// </summary>
    private double BracketCost(List<QueueCandidate> group, bool winnersNext)
    {
        var bracket = WinnersBracket.Of(group.Select(c => c.LastWon));
        if (bracket is null) return _w.MixedBrackets;
        return bracket == winnersNext ? 0 : _w.OtherBracket;
    }

    private double RepeatCost(List<QueueCandidate> teamA, List<QueueCandidate> teamB, PairingHistory history, double variety)
    {
        double cost = 0;

        // Back to back: avoid putting people who just played together (as partners or opponents) in the same
        // game again right away. Fixed partners are exempt from each other; they always play together.
        var group = teamA.Concat(teamB).ToList();
        var allTogetherLastTime = true;
        for (var i = 0; i < group.Count; i++)
            for (var j = i + 1; j < group.Count; j++)
            {
                var together = history.PlayedLastGameTogether(group[i].UserId, group[j].UserId);
                allTogetherLastTime &= together;
                if (together && group[i].PartnerId != group[j].UserId) cost += _w.BackToBack * variety;
            }
        // Every pair played together last game = the very same group again (same four, or the same singles
        // opponent). Never, unless there's no one else to make a game with.
        if (allTogetherLastTime) cost += _w.SameGroupAgain;
        foreach (var team in new[] { teamA, teamB })
            if (team.Count == 2 && team[0].PartnerId != team[1].UserId && history.WereLastGamePartners(team[0].UserId, team[1].UserId))
                cost += _w.SamePartnerAgain;

        // Fixed partners always play together, so that's never a "repeat" to avoid.
        if (teamA.Count == 2 && teamA[0].PartnerId != teamA[1].UserId) cost += variety * RepeatPartnerCost(history.PartnerCount(teamA[0].UserId, teamA[1].UserId));
        if (teamB.Count == 2 && teamB[0].PartnerId != teamB[1].UserId) cost += variety * RepeatPartnerCost(history.PartnerCount(teamB[0].UserId, teamB[1].UserId));
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
