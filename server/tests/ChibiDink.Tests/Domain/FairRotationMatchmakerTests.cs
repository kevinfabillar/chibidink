using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matchmaking;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Tests.Domain;

public sealed class FairRotationMatchmakerTests
{
    private readonly IMatchmakingStrategy _matchmaker = new FairRotationMatchmaker();
    private static readonly DateTimeOffset Now = TestData.Now;

    private static QueueCandidate Player(int skill = 3, int games = 0, int waitedMinutes = 0) =>
        new(Guid.NewGuid(), skill, games, Now.AddMinutes(-waitedMinutes));

    private static MatchmakingRequest Request(IReadOnlyList<QueueCandidate> players, int courts = 1,
        PairingHistory? history = null, QueueMode mode = QueueMode.FairMatch) =>
        new(MatchFormat.Doubles, courts, players, history ?? PairingHistory.Empty, Now, SkillTolerance: 1.0, TimeSpan.FromMinutes(20), mode);

    private static HashSet<Guid> Picked(ProposedLineup l) => l.TeamA.Concat(l.TeamB).ToHashSet();

    [Fact]
    public void Fills_one_court_per_four_players_without_reusing_anyone()
    {
        var players = Enumerable.Range(0, 9).Select(i => Player(waitedMinutes: i)).ToList();

        var lineups = _matchmaker.FindLineups(Request(players, courts: 3));

        Assert.Equal(2, lineups.Count);
        var all = lineups.SelectMany(Picked).ToList();
        Assert.Equal(8, all.Distinct().Count());
    }

    [Fact]
    public void Players_with_fewer_games_go_first()
    {
        var rested = Enumerable.Range(0, 4).Select(_ => Player(games: 1, waitedMinutes: 1)).ToList();
        var busy = Enumerable.Range(0, 4).Select(_ => Player(games: 3, waitedMinutes: 10)).ToList();

        var lineup = Assert.Single(_matchmaker.FindLineups(Request([.. busy, .. rested])));

        Assert.True(Picked(lineup).SetEquals(rested.Select(p => p.UserId)));
    }

    [Fact]
    public void Long_waiting_player_is_protected_even_with_more_games()
    {
        var veteran = Player(games: 4, waitedMinutes: 25);
        var others = Enumerable.Range(0, 6).Select(_ => Player(games: 0, waitedMinutes: 2)).ToList();

        var lineup = Assert.Single(_matchmaker.FindLineups(Request([.. others, veteran])));

        Assert.Contains(veteran.UserId, Picked(lineup));
    }

    [Fact]
    public void Fair_match_ignores_skill_and_takes_the_front_of_the_line()
    {
        var front = new[] { Player(1, waitedMinutes: 9), Player(3, waitedMinutes: 8), Player(1, waitedMinutes: 7), Player(3, waitedMinutes: 6) };
        var later = Enumerable.Range(0, 4).Select(_ => Player(2, waitedMinutes: 1)).ToList();

        var lineup = Assert.Single(_matchmaker.FindLineups(Request([.. later, .. front])));

        Assert.True(Picked(lineup).SetEquals(front.Select(p => p.UserId)));
        Assert.False(lineup.ExceedsSkillTolerance);
    }

    [Fact]
    public void Skill_based_puts_four_of_the_same_tier_together()
    {
        // Queue order: beginner, intermediate, beginner, intermediate, ... — two full tiers.
        var players = Enumerable.Range(0, 8).Select(i => Player(i % 2 == 0 ? 1 : 3, waitedMinutes: 20 - i)).ToList();

        var lineups = _matchmaker.FindLineups(Request(players, courts: 2, mode: QueueMode.SkillBased));

        Assert.Equal(2, lineups.Count);
        foreach (var l in lineups)
        {
            var tiers = Picked(l).Select(id => players.First(p => p.UserId == id).Skill).Distinct();
            Assert.Single(tiers);
            Assert.False(l.ExceedsSkillTolerance);
        }
    }

    [Fact]
    public void Skill_based_still_fills_the_court_with_a_close_mix_when_no_tier_has_four()
    {
        var players = new[] { Player(1, waitedMinutes: 5), Player(2, waitedMinutes: 4), Player(2, waitedMinutes: 3), Player(3, waitedMinutes: 2), Player(1, waitedMinutes: 1) };

        var lineup = Assert.Single(_matchmaker.FindLineups(Request(players, mode: QueueMode.SkillBased)));

        Assert.True(lineup.ExceedsSkillTolerance); // shown as a mixed-skill match
        Assert.Equal(4, Picked(lineup).Count);
    }

    [Fact]
    public void Avoids_repeating_the_same_partners()
    {
        var p = Enumerable.Range(0, 4).Select(i => Player(waitedMinutes: 4 - i)).ToList();
        var history = new PairingHistory();
        history.AddMatch([p[0].UserId, p[1].UserId], [p[2].UserId, p[3].UserId]);

        var lineup = Assert.Single(_matchmaker.FindLineups(Request(p, history: history)));

        var teamA = lineup.TeamA.ToHashSet();
        Assert.False(teamA.SetEquals([p[0].UserId, p[1].UserId]) || teamA.SetEquals([p[2].UserId, p[3].UserId]));
    }

    [Fact]
    public void Nobody_is_skipped_forever_over_many_rounds()
    {
        // 10 players, 2 courts, play 10 rounds: game counts should never drift by more than 1.
        var games = Enumerable.Range(0, 10).ToDictionary(_ => Guid.NewGuid(), _ => 0);
        var waiting = games.Keys.ToDictionary(id => id, _ => Now);
        var history = new PairingHistory();

        for (var round = 0; round < 10; round++)
        {
            var now = Now.AddMinutes(15 * round);
            var candidates = games.Select(g => new QueueCandidate(g.Key, 3, g.Value, waiting[g.Key])).ToList();
            var lineups = _matchmaker.FindLineups(new MatchmakingRequest(
                MatchFormat.Doubles, 2, candidates, history, now, 1.0, TimeSpan.FromMinutes(20)));

            foreach (var l in lineups)
            {
                history.AddMatch(l.TeamA, l.TeamB);
                foreach (var id in Picked(l))
                {
                    games[id]++;
                    waiting[id] = now.AddMinutes(14);
                }
            }
            Assert.True(games.Values.Max() - games.Values.Min() <= 1, $"Round {round}: unfair spread");
        }
    }
}
