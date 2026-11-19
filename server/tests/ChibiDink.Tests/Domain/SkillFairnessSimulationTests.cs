using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matchmaking;
using ChibiDink.Domain.Sessions;
using Xunit.Abstractions;

namespace ChibiDink.Tests.Domain;

/// <summary>
/// Skill Based queues over a whole night: 21 players on 2 courts, with different mixes of Beginners, Intermediates and
/// Advanced players. Equal games still come first (as in Fair Match, the baseline); levels only decide between
/// players who are equally due.
/// </summary>
public sealed class SkillFairnessSimulationTests(ITestOutputHelper output)
{
    private const int Courts = 2, Games = 40;

    private sealed record Night(int[] Games, int[] Tier, int MaxGapDuring, int MixedGames);

    private static Night Play(int[] tierCounts, QueueMode mode, int seed)
    {
        var rng = new Random(seed);
        var tier = tierCounts.SelectMany((n, t) => Enumerable.Repeat(t + 1, n)).ToArray();
        var players = tier.Length;
        // Ids from the seed (not Guid.NewGuid), so every run of a night is identical: ids break exact ties in line.
        var ids = Enumerable.Range(0, players).Select(_ => { var bytes = new byte[16]; rng.NextBytes(bytes); return new Guid(bytes); }).ToArray();
        var games = new int[players];
        var playing = new bool[players];
        var waitingSince = ids.Select(_ => TestData.Now.AddSeconds(rng.Next(0, 300))).ToArray();
        var history = new GameLog();
        var matchmaker = new FairRotationMatchmaker();
        var freeAt = Enumerable.Repeat(TestData.Now.AddMinutes(5), Courts).ToArray();
        var onCourt = new List<int>?[Courts];
        int started = 0, mixed = 0, maxGap = 0;

        while (started < Games)
        {
            var c = Array.IndexOf(freeAt, freeAt.Min());
            var now = freeAt[c];
            if (onCourt[c] is { } done)
                foreach (var i in done) { playing[i] = false; games[i]++; waitingSince[i] = now; }

            var candidates = Enumerable.Range(0, players).Where(i => !playing[i])
                .Select(i => new QueueCandidate(ids[i], tier[i], games[i], waitingSince[i])).ToList();
            var lineup = matchmaker.FindLineups(new MatchmakingRequest(MatchFormat.Doubles, 1, candidates, history, now, 1.0, TimeSpan.FromMinutes(20), mode)).SingleOrDefault();
            if (lineup is null) { onCourt[c] = null; freeAt[c] = now.AddMinutes(1); continue; }

            var four = lineup.TeamA.Concat(lineup.TeamB).Select(id => Array.IndexOf(ids, id)).ToList();
            foreach (var i in four) playing[i] = true;
            if (four.Select(i => tier[i]).Distinct().Count() > 1) mixed++;
            history.AddMatch(lineup.TeamA, lineup.TeamB);
            onCourt[c] = four;
            freeAt[c] = now.AddMinutes(rng.Next(10, 17));
            started++;
            var counts = Enumerable.Range(0, players).Select(i => games[i] + (playing[i] ? 1 : 0)).ToList();
            maxGap = Math.Max(maxGap, counts.Max() - counts.Min());
        }
        var final = Enumerable.Range(0, players).Select(i => games[i] + (playing[i] ? 1 : 0)).ToArray();
        return new Night(final, tier, maxGap, mixed);
    }

    [Theory]
    [InlineData(QueueMode.FairMatch, 7, 7, 7)]
    [InlineData(QueueMode.SkillBased, 7, 7, 7)]
    [InlineData(QueueMode.SkillBased, 5, 10, 6)]
    [InlineData(QueueMode.SkillBased, 8, 8, 5)]
    [InlineData(QueueMode.SkillBased, 3, 12, 6)]
    [InlineData(QueueMode.SkillBased, 9, 9, 3)]
    public void Twenty_one_players_on_two_courts(QueueMode mode, int beginners, int intermediates, int advanced)
    {
        var nights = Enumerable.Range(1, 100).Select(seed => Play([beginners, intermediates, advanced], mode, seed)).ToList();
        double PerTier(int t) => nights.Average(n => Enumerable.Range(0, n.Games.Length).Where(i => n.Tier[i] == t).Average(i => n.Games[i]));
        var gaps = nights.Select(n => n.Games.Max() - n.Games.Min()).ToList();
        output.WriteLine(
            $"RESULT|{mode}|{beginners}/{intermediates}/{advanced}|{PerTier(1):0.0}|{PerTier(2):0.0}|{PerTier(3):0.0}|" +
            $"{gaps.Count(g => g <= 1)}/100|{gaps.Average():0.00}|{nights.Max(n => n.MaxGapDuring)}|{nights.Average(n => n.MixedGames) / Games:P0}");

        // Still a fair match: every level gets on court, and nobody is ever more than 2 games apart.
        Assert.All(nights, n => Assert.True(n.Games.Min() > 0));
        Assert.All(nights, n => Assert.True(n.MaxGapDuring <= 2, $"gap reached {n.MaxGapDuring}"));
    }
}
