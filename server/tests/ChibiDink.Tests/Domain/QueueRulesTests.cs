using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matchmaking;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Tests.Domain;

/// <summary>
/// The rules of the three queues, one rule per test, each on a small line where the right answer is obvious:
/// Fair Match, Skill Based, and Fair Match with Winners vs Losers.
/// </summary>
public sealed class QueueRulesTests
{
    private static readonly DateTimeOffset Now = TestData.Now;
    private readonly FairRotationMatchmaker _matchmaker = new();

    /// <summary>A waiting player: games played, minutes waited, level (1–3), last result (null = new).</summary>
    private static QueueCandidate P(int games = 1, int waited = 5, int skill = 2, bool? lastWon = null, Guid? partner = null) =>
        new(Guid.NewGuid(), skill, games, Now.AddMinutes(-waited), partner, lastWon);

    private ProposedLineup Next(IReadOnlyList<QueueCandidate> line, QueueMode mode = QueueMode.FairMatch, PairingHistory? history = null,
        bool winnersVsLosers = false, bool winnersNext = true) =>
        Assert.Single(_matchmaker.FindLineups(new MatchmakingRequest(MatchFormat.Doubles, 1, line, history ?? PairingHistory.Empty, Now, 1.0,
            TimeSpan.FromMinutes(20), mode, winnersVsLosers, winnersNext)));

    private static HashSet<Guid> Four(ProposedLineup l) => [.. l.TeamA, .. l.TeamB];

    // ---- Rules every queue follows -----------------------------------------------------------

    [Theory]
    [InlineData(QueueMode.FairMatch, false)]
    [InlineData(QueueMode.SkillBased, false)]
    [InlineData(QueueMode.FairMatch, true)]
    public void The_front_of_the_line_always_plays(QueueMode mode, bool winnersVsLosers)
    {
        var front = P(games: 0, waited: 12, skill: 1, lastWon: null);
        var line = new[] { front }.Concat(Enumerable.Range(0, 9).Select(i => P(games: 1, waited: 10 - i, skill: 1 + i % 3, lastWon: i % 2 == 0))).ToList();

        Assert.Contains(front.UserId, Four(Next(line, mode, winnersVsLosers: winnersVsLosers, winnersNext: false)));
    }

    [Theory]
    [InlineData(QueueMode.FairMatch, false)]
    [InlineData(QueueMode.SkillBased, false)]
    [InlineData(QueueMode.FairMatch, true)]
    public void Waiting_past_20_minutes_jumps_the_line_even_with_more_games(QueueMode mode, bool winnersVsLosers)
    {
        var longWait = P(games: 3, waited: 25, skill: 2, lastWon: false);
        var line = Enumerable.Range(0, 7).Select(i => P(games: 1, waited: 6 - i % 3, skill: 2, lastWon: true)).Append(longWait).ToList();

        Assert.Contains(longWait.UserId, Four(Next(line, mode, winnersVsLosers: winnersVsLosers)));
    }

    [Theory]
    [InlineData(QueueMode.FairMatch, false)]
    [InlineData(QueueMode.SkillBased, false)]
    [InlineData(QueueMode.FairMatch, true)]
    public void Fewest_games_go_first(QueueMode mode, bool winnersVsLosers)
    {
        var due = Enumerable.Range(0, 4).Select(i => P(games: 1, waited: 3, skill: 2, lastWon: i < 2)).ToList();
        var ahead = Enumerable.Range(0, 4).Select(_ => P(games: 3, waited: 10, skill: 2, lastWon: true)).ToList();

        Assert.True(Four(Next([.. ahead, .. due], mode, winnersVsLosers: winnersVsLosers)).SetEquals(due.Select(p => p.UserId)));
    }

    [Fact]
    public void The_exact_same_four_never_play_twice_in_a_row_when_anyone_else_can()
    {
        var last = Enumerable.Range(0, 4).Select(i => P(games: 1, waited: 10)).ToList();
        var others = Enumerable.Range(0, 4).Select(i => P(games: 1, waited: 2)).ToList();
        var history = new PairingHistory();
        history.AddMatch([last[0].UserId, last[1].UserId], [last[2].UserId, last[3].UserId]);

        Assert.False(Four(Next([.. last, .. others], history: history)).SetEquals(last.Select(p => p.UserId)));
    }

    [Fact]
    public void When_the_same_four_must_play_again_last_games_partners_are_split()
    {
        var (a, b, c, d) = (P(), P(), P(), P());
        var history = new PairingHistory();
        history.AddMatch([a.UserId, b.UserId], [c.UserId, d.UserId]);

        var lineup = Next([a, b, c, d], history: history);

        Assert.False(lineup.TeamA.Contains(a.UserId) && lineup.TeamA.Contains(b.UserId));
        Assert.False(lineup.TeamB.Contains(a.UserId) && lineup.TeamB.Contains(b.UserId));
    }

    [Fact]
    public void Fixed_partners_play_together_on_the_same_team()
    {
        var (x, y) = (Guid.NewGuid(), Guid.NewGuid());
        var p1 = new QueueCandidate(x, 2, 1, Now.AddMinutes(-10), y);
        var p2 = new QueueCandidate(y, 2, 1, Now.AddMinutes(-1), x);
        var line = new[] { p1 }.Concat(Enumerable.Range(0, 6).Select(i => P(games: 1, waited: 9 - i))).Append(p2).ToList();

        var lineup = Next(line);

        var team = lineup.TeamA.Contains(x) ? lineup.TeamA : lineup.TeamB;
        Assert.Contains(y, team);
    }

    // ---- Fair Match -------------------------------------------------------------------------

    [Fact]
    public void Fair_match_ignores_skill()
    {
        // The four who are due are two Beginners and two Advanced players: they play together.
        var due = new[] { P(waited: 10, skill: 1), P(waited: 9, skill: 3), P(waited: 8, skill: 1), P(waited: 7, skill: 3) };
        var behind = Enumerable.Range(0, 4).Select(i => P(waited: 2, skill: 2)).ToList();

        Assert.True(Four(Next([.. due, .. behind])).SetEquals(due.Select(p => p.UserId)));
    }

    // ---- Skill Based ------------------------------------------------------------------------

    [Fact]
    public void Skill_based_puts_four_of_one_level_on_a_court()
    {
        // Same line as above: Skill Based waits for a same-level four (the front player's Beginners).
        var beginners = new[] { P(waited: 10, skill: 1), P(waited: 8, skill: 1), P(waited: 2, skill: 1), P(waited: 1, skill: 1) };
        var intermediates = new[] { P(waited: 9, skill: 3), P(waited: 7, skill: 3) };

        var lineup = Next([.. beginners, .. intermediates], QueueMode.SkillBased);

        Assert.True(Four(lineup).SetEquals(beginners.Select(p => p.UserId)));
        Assert.False(lineup.ExceedsSkillTolerance);
    }

    [Fact]
    public void Skill_based_never_leaves_a_court_empty_when_no_level_has_four()
    {
        var line = new[] { P(skill: 1), P(skill: 1), P(skill: 2), P(skill: 2), P(skill: 3), P(skill: 3) };

        var lineup = Next(line, QueueMode.SkillBased);

        Assert.Equal(4, Four(lineup).Count);
        Assert.True(lineup.ExceedsSkillTolerance); // shown as a mixed-skill game
    }

    [Fact]
    public void Skill_based_a_level_with_only_three_players_still_gets_games()
    {
        // Three Beginners (can never make their own court) who are behind on games: the front one gets a mixed game.
        var stranded = P(games: 0, waited: 12, skill: 1);
        var line = new[] { stranded, P(games: 0, waited: 11, skill: 1), P(games: 0, waited: 10, skill: 1) }
            .Concat(Enumerable.Range(0, 6).Select(i => P(games: 2, waited: 5 - i % 3, skill: 3))).ToList();

        Assert.Contains(stranded.UserId, Four(Next(line, QueueMode.SkillBased)));
    }

    // ---- Fair Match with Winners vs Losers ---------------------------------------------------

    [Fact]
    public void Winners_vs_losers_new_players_play_the_winners()
    {
        var (n1, n2) = (P(games: 0, waited: 15), P(games: 0, waited: 14));
        var winners = new[] { P(games: 1, waited: 1, lastWon: true), P(games: 1, waited: 1, lastWon: true) };
        var losers = new[] { P(games: 1, waited: 2, lastWon: false), P(games: 1, waited: 2, lastWon: false) };

        var four = Four(Next([n1, n2, .. losers, .. winners], winnersVsLosers: true, winnersNext: false));

        Assert.True(four.SetEquals([n1.UserId, n2.UserId, .. winners.Select(w => w.UserId)]));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Winners_vs_losers_the_bracket_whose_turn_it_is_plays(bool winnersNext)
    {
        // Everyone equally due; a winner and a loser at the very front (one of them must play: the front always does).
        var front = P(games: 1, waited: 20 - 1, lastWon: winnersNext);
        var winners = Enumerable.Range(0, 4).Select(i => P(games: 1, waited: 10 - i, lastWon: true)).ToList();
        var losers = Enumerable.Range(0, 4).Select(i => P(games: 1, waited: 10 - i, lastWon: false)).ToList();

        var lineup = Next([front, .. winners, .. losers], winnersVsLosers: true, winnersNext: winnersNext);

        var line = new[] { front }.Concat(winners).Concat(losers).ToDictionary(p => p.UserId, p => p.LastWon);
        Assert.All(Four(lineup), id => Assert.Equal(winnersNext, line[id]));
        Assert.Equal(winnersNext, lineup.WinnersBracket);
    }

    [Fact]
    public void Winners_vs_losers_never_calls_someone_with_two_extra_games_to_keep_a_bracket()
    {
        // Due (1 game): two winners and two losers. Two more winners have 3 games. Winners' turn: a pure winners'
        // court would need those two (2 extra games each), so the due four play, mixed.
        var due = new[] { P(games: 1, waited: 10, lastWon: true), P(games: 1, waited: 9, lastWon: true), P(games: 1, waited: 8, lastWon: false), P(games: 1, waited: 7, lastWon: false) };
        var ahead = new[] { P(games: 3, waited: 15, lastWon: true), P(games: 3, waited: 15, lastWon: true) };

        var four = Four(Next([.. due, .. ahead], winnersVsLosers: true, winnersNext: true));

        Assert.True(four.SetEquals(due.Select(p => p.UserId)));
    }

    [Fact]
    public void Winners_vs_losers_off_brackets_dont_matter()
    {
        // Same line as the turn test, switch off: plain Fair Match order (the front four by waiting time).
        var line = Enumerable.Range(0, 8).Select(i => P(games: 1, waited: 20 - i, lastWon: i % 2 == 0)).ToList();

        Assert.True(Four(Next(line)).SetEquals(line.Take(4).Select(p => p.UserId)));
    }
}
