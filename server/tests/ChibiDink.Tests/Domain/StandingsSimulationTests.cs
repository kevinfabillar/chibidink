using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matchmaking;
using ChibiDink.Domain.Sessions;
using Xunit.Abstractions;

namespace ChibiDink.Tests.Domain;

/// <summary>
/// A whole night through the real matchmaker and the real standings: 17 players, 2 courts, everyone plays 5 games
/// (then goes home). Each player has a hidden skill, so stronger teams usually win. With so few games, lots of
/// players finish on the same record, which is exactly what the tiebreakers are for.
/// </summary>
public sealed class StandingsSimulationTests(ITestOutputHelper output)
{
    private const int Players = 17, Courts = 2, GamesEach = 5;

    private sealed record Night(IReadOnlyList<GameResult> Games, IReadOnlyList<PlayerRecord> Records, IReadOnlyList<int> Skill);

    private static Night Play(int seed)
    {
        var rng = new Random(seed);
        var ids = Enumerable.Range(0, Players).Select(_ => Guid.NewGuid()).ToList();
        var skill = ids.Select(_ => rng.Next(1, 6)).ToList(); // 1 (new) to 5 (strong)
        var games = new int[Players];
        var waitingSince = ids.Select(_ => TestData.Now.AddSeconds(rng.Next(0, 300))).ToArray();
        var playing = new bool[Players];
        var results = new List<GameResult>();
        var history = new PairingHistory();
        var matchmaker = new FairRotationMatchmaker();
        var freeAt = Enumerable.Repeat(TestData.Now.AddMinutes(5), Courts).ToArray();
        var onCourt = new (List<int> A, List<int> B)?[Courts];

        for (var safety = 0; safety < 500; safety++)
        {
            var c = Array.IndexOf(freeAt, freeAt.Min());
            var now = freeAt[c];
            if (onCourt[c] is { } game)
            {
                // Stronger team usually wins; the loser scores 3 to 9.
                var (a, b) = game;
                double sa = a.Sum(i => skill[i]), sb = b.Sum(i => skill[i]);
                var aWins = rng.NextDouble() < sa / (sa + sb);
                var (w, l) = aWins ? (a, b) : (b, a);
                results.Add(new GameResult(w.Select(i => ids[i]).ToList(), l.Select(i => ids[i]).ToList(), 11, rng.Next(3, 10)));
                foreach (var i in a.Concat(b)) { playing[i] = false; games[i]++; waitingSince[i] = now; }
                onCourt[c] = null;
            }

            // Anyone with 5 games has gone home.
            var candidates = Enumerable.Range(0, Players)
                .Where(i => !playing[i] && games[i] < GamesEach)
                .Select(i => new QueueCandidate(ids[i], skill[i], games[i], waitingSince[i]))
                .ToList();
            var lineup = matchmaker.FindLineups(new MatchmakingRequest(MatchFormat.Doubles, 1, candidates, history, now, 1.0, TimeSpan.FromMinutes(20))).SingleOrDefault();
            if (lineup is null)
            {
                if (onCourt.All(x => x is null)) break; // nobody left to play
                freeAt[c] = now.AddMinutes(1);
                continue;
            }
            var teamA = lineup.TeamA.Select(id => ids.IndexOf(id)).ToList();
            var teamB = lineup.TeamB.Select(id => ids.IndexOf(id)).ToList();
            foreach (var i in teamA.Concat(teamB)) playing[i] = true;
            history.AddMatch(lineup.TeamA, lineup.TeamB);
            onCourt[c] = (teamA, teamB);
            freeAt[c] = now.AddMinutes(rng.Next(10, 17));
        }

        var records = ids.Select(id => new PlayerRecord(id, results.Count(r => r.Winners.Contains(id)), results.Count(r => r.Losers.Contains(id)))).ToList();
        return new Night(results, records, skill);
    }

    [Fact]
    public void Seventeen_players_two_courts_five_games_each()
    {
        var night = Play(seed: 7);
        var standings = SessionStandings.Rank(night.Records, night.Games);
        var ids = night.Records.Select(r => r.UserId).ToList();

        output.WriteLine($"{night.Games.Count} games played. Rank | Player | Skill | W-L | Win rate | Tiebreak");
        foreach (var s in standings)
        {
            var i = ids.IndexOf(s.UserId);
            var r = night.Records[i];
            output.WriteLine($"ROW|{(s.Tied ? "T-" : "")}{s.Rank}|P{i + 1}|{night.Skill[i]}|{r.Wins}-{r.Losses}|{(double)r.Wins / (r.Wins + r.Losses):P0}|{s.TieBreak ?? ""}");
        }

        // Everyone got their games (one player can end a game short: 17 × 5 isn't a multiple of 4).
        Assert.All(night.Records, r => Assert.InRange(r.Wins + r.Losses, GamesEach - 1, GamesEach));
        // Same record → the order between them comes from a tiebreaker (and says which), or they share the place.
        for (var k = 0; k + 1 < standings.Count; k++)
        {
            var (a, b) = (night.Records[ids.IndexOf(standings[k].UserId)], night.Records[ids.IndexOf(standings[k + 1].UserId)]);
            if (a.Wins != b.Wins || a.Losses != b.Losses) continue;
            if (standings[k].Rank == standings[k + 1].Rank) Assert.True(standings[k].Tied && standings[k + 1].Tied);
            else Assert.NotNull(standings[k].TieBreak);
        }
    }
}
