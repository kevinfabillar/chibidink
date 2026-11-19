using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matchmaking;
using Xunit.Abstractions;

namespace ChibiDink.Tests.Domain;

/// <summary>
/// Fair Match with Winners vs Losers on and off, over whole nights on 2 courts. Players have a hidden strength, so
/// stronger teams usually win. Checks that game counts stay as even as plain Fair Match (equal games always come
/// first) while courts more often hold four players who all won, or all lost, their last game.
/// </summary>
public sealed class WinnersVsLosersSimulationTests(ITestOutputHelper output)
{
    private const int Games = 40;

    private sealed record Night(int[] Games, int MaxGapDuring, int SameResultCourts, int CourtsWithResults, double AverageStrengthGap, int InTurn = 0);

    private static Night Play(int players, bool winnersVsLosers, int seed, int courts = 2, List<string>? log = null)
    {
        var Courts = courts;
        string P(int i) => ((char)('A' + i)).ToString();
        var rng = new Random(seed);
        // Ids from the seed (not Guid.NewGuid), so every run of a night is identical: ids break exact ties in line.
        var ids = Enumerable.Range(0, players).Select(_ => { var bytes = new byte[16]; rng.NextBytes(bytes); return new Guid(bytes); }).ToArray();
        var strength = ids.Select(_ => 1 + rng.NextDouble() * 4).ToArray(); // 1 (new) to 5 (strong)
        var games = new int[players];
        var lastWon = new bool?[players];
        var playing = new bool[players];
        var waitingSince = ids.Select(_ => TestData.Now.AddSeconds(rng.Next(0, 300))).ToArray();
        var history = new PairingHistory();
        var matchmaker = new FairRotationMatchmaker();
        var freeAt = Enumerable.Repeat(TestData.Now.AddMinutes(5), Courts).ToArray();
        var onCourt = new (int[] A, int[] B)?[Courts];
        int started = 0, maxGap = 0, sameResult = 0, withResults = 0, inTurn = 0;
        var winnersNext = true;
        var strengthGaps = new List<double>();

        while (started < Games)
        {
            var c = Array.IndexOf(freeAt, freeAt.Min());
            var now = freeAt[c];
            if (onCourt[c] is { } game)
            {
                double sa = game.A.Sum(i => strength[i]), sb = game.B.Sum(i => strength[i]);
                var aWins = rng.NextDouble() < sa / (sa + sb);
                foreach (var i in game.A) { lastWon[i] = aWins; }
                foreach (var i in game.B) { lastWon[i] = !aWins; }
                foreach (var i in game.A.Concat(game.B)) { playing[i] = false; games[i]++; waitingSince[i] = now; }
                log?.Add($"   result: {(aWins ? string.Join("+", game.A.Select(P)) : string.Join("+", game.B.Select(P)))} won");
                onCourt[c] = null;
            }

            var candidates = Enumerable.Range(0, players).Where(i => !playing[i])
                .Select(i => new QueueCandidate(ids[i], 2, games[i], waitingSince[i], LastWon: lastWon[i])).ToList();
            var lineup = matchmaker.FindLineups(new MatchmakingRequest(MatchFormat.Doubles, 1, candidates, history, now, 1.0,
                TimeSpan.FromMinutes(20), WinnersVsLosers: winnersVsLosers, WinnersBracketNext: winnersNext)).SingleOrDefault();
            if (lineup is null) { freeAt[c] = now.AddMinutes(1); continue; }

            var a = lineup.TeamA.Select(id => Array.IndexOf(ids, id)).ToArray();
            var b = lineup.TeamB.Select(id => Array.IndexOf(ids, id)).ToArray();
            var four = a.Concat(b).ToArray();
            foreach (var i in four) playing[i] = true;
            if (four.All(i => lastWon[i] is not null))
            {
                withResults++;
                if (four.Select(i => lastWon[i]).Distinct().Count() == 1) sameResult++;
            }
            strengthGaps.Add(four.Max(i => strength[i]) - four.Min(i => strength[i]));
            history.AddMatch(lineup.TeamA, lineup.TeamB);
            var bracket = WinnersBracket.Of(four.Select(i => lastWon[i]));
            if (bracket == winnersNext) inTurn++;
            var turnLabel = winnersNext ? "winners' turn" : "losers' turn";
            var bracketLabel = bracket is null ? "MIXED" : bracket == true ? "WINNERS" : "LOSERS";
            winnersNext = bracket != true;
            log?.Add($"[{turnLabel}, got {bracketLabel}] " + $"Game {started + 1}: {string.Join("+", a.Select(P))} vs {string.Join("+", b.Select(P))}   " +
                     $"(last results: {string.Join(" ", four.Select(i => $"{P(i)}={(lastWon[i] is null ? "new" : lastWon[i] == true ? "W" : "L")}"))})   " +
                     $"sitting out: {string.Join(",", Enumerable.Range(0, players).Where(i => !playing[i]).Select(P))}");
            onCourt[c] = (a, b);
            freeAt[c] = now.AddMinutes(rng.Next(10, 17));
            started++;
            var counts = Enumerable.Range(0, players).Select(i => games[i] + (playing[i] ? 1 : 0)).ToList();
            maxGap = Math.Max(maxGap, counts.Max() - counts.Min());
        }
        var final = Enumerable.Range(0, players).Select(i => games[i] + (playing[i] ? 1 : 0)).ToArray();
        return new Night(final, maxGap, sameResult, withResults, strengthGaps.Average(), inTurn);
    }

    [Theory]
    [InlineData(17)]
    [InlineData(21)]
    public void Winners_vs_losers_keeps_games_even(int players)
    {
        var off = Enumerable.Range(1, 100).Select(seed => Play(players, false, seed)).ToList();
        var on = Enumerable.Range(1, 100).Select(seed => Play(players, true, seed)).ToList();

        string Line(string label, List<Night> nights) =>
            $"RESULT|{players}|{label}|{nights.Count(n => n.Games.Max() - n.Games.Min() <= 1)}/100|{nights.Average(n => n.Games.Max() - n.Games.Min()):0.00}|" +
            $"{nights.Max(n => n.MaxGapDuring)}|{nights.Sum(n => n.SameResultCourts) / (double)nights.Sum(n => n.CourtsWithResults):P0}|{nights.Average(n => n.AverageStrengthGap):0.00}";
        output.WriteLine(Line("off", off));
        output.WriteLine(Line("on", on));

        // Equal games still come first: as even as plain Fair Match.
        Assert.True(on.Max(n => n.MaxGapDuring) <= off.Max(n => n.MaxGapDuring), "Winners vs Losers made game counts less even");
        Assert.True(on.Count(n => n.Games.Max() - n.Games.Min() <= 1) >= off.Count(n => n.Games.Max() - n.Games.Min() <= 1) - 5);
        // And it does group by result more often.
        Assert.True(on.Sum(n => n.SameResultCourts) > off.Sum(n => n.SameResultCourts));
    }

    [Fact]
    public void Ten_players_the_two_who_sat_out_go_on_next()
    {
        // Game 1: A+B beat C+D. Game 2: E+F vs G+H is still playing. I and J haven't played yet.
        var (a, b, c, d, i, j) = (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        var start = TestData.Now;
        var history = new PairingHistory();
        history.AddMatch([a, b], [c, d]);
        var free = new List<QueueCandidate>
        {
            new(i, 2, 0, start, LastWon: null),
            new(j, 2, 0, start.AddSeconds(30), LastWon: null),
            new(a, 2, 1, start.AddMinutes(14), LastWon: true),
            new(b, 2, 1, start.AddMinutes(14), LastWon: true),
            new(c, 2, 1, start.AddMinutes(14), LastWon: false),
            new(d, 2, 1, start.AddMinutes(14), LastWon: false),
        };

        var lineup = Assert.Single(new FairRotationMatchmaker().FindLineups(
            new MatchmakingRequest(MatchFormat.Doubles, 1, free, history, start.AddMinutes(14), 1.0, TimeSpan.FromMinutes(20), WinnersVsLosers: true)));
        var four = lineup.TeamA.Concat(lineup.TeamB).ToList();
        string Name(Guid id) => id == a ? "A" : id == b ? "B" : id == c ? "C" : id == d ? "D" : id == i ? "I" : "J";
        output.WriteLine($"NEXT|{string.Join("+", lineup.TeamA.Select(Name))} vs {string.Join("+", lineup.TeamB.Select(Name))}");

        // I and J (no games yet) always go on: winners/losers never costs anyone their turn.
        Assert.Contains(i, four);
        Assert.Contains(j, four);
        // New players play the winners: A and B join them (C and D, who lost, wait), split up as partners.
        var others = four.Where(x => x != i && x != j).ToList();
        Assert.True(others.All(x => x == a || x == b), "new players should play last game's winners");
        Assert.False(lineup.TeamA.Contains(others[0]) && lineup.TeamA.Contains(others[1]));
        Assert.False(lineup.TeamB.Contains(others[0]) && lineup.TeamB.Contains(others[1]));
    }

    [Fact]
    public void Ten_players_one_court()
    {
        var off = Enumerable.Range(1, 100).Select(seed => Play(10, false, seed, courts: 1)).ToList();
        var on = Enumerable.Range(1, 100).Select(seed => Play(10, true, seed, courts: 1)).ToList();
        foreach (var (label, nights) in new[] { ("off", off), ("on", on) })
            output.WriteLine($"RESULT|10p1c|{label}|{nights.Count(n => n.Games.Max() - n.Games.Min() <= 1)}/100|{nights.Average(n => n.Games.Max() - n.Games.Min()):0.00}|" +
                             $"{nights.Max(n => n.MaxGapDuring)}|{nights.Sum(n => n.SameResultCourts) / (double)nights.Sum(n => n.CourtsWithResults):P0}|{nights.Sum(n => n.InTurn) / (nights.Count * (double)Games):P0}");

        var log = new List<string>();
        var sample = Play(10, true, seed: 1, courts: 1, log: log);
        foreach (var line in log.Take(30)) output.WriteLine("LOG|" + line);
        output.WriteLine("GAMES|" + string.Join(" ", sample.Games.Select((g, i) => $"{(char)('A' + i)}={g}")));

        Assert.True(on.Max(n => n.MaxGapDuring) <= off.Max(n => n.MaxGapDuring));
        Assert.True(on.Sum(n => n.SameResultCourts) > off.Sum(n => n.SameResultCourts));
    }
}
