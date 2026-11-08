using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matchmaking;

namespace ChibiDink.Tests.Domain;

/// <summary>Nobody gets the same people again in their very next game, as partners or opponents.</summary>
public sealed class BackToBackTests
{
    private readonly IMatchmakingStrategy _matchmaker = new FairRotationMatchmaker();
    private static readonly DateTimeOffset Now = TestData.Now;

    private static MatchmakingRequest Request(IReadOnlyList<QueueCandidate> players, PairingHistory history) =>
        new(MatchFormat.Doubles, 1, players, history, Now, SkillTolerance: 1.0, TimeSpan.FromMinutes(20));

    private static QueueCandidate Player(int waitedMinutes, int games = 1) => new(Guid.NewGuid(), 3, games, Now.AddMinutes(-waitedMinutes));

    [Fact]
    public void The_four_who_just_played_are_not_put_back_on_together_when_others_are_waiting()
    {
        // Court 1 just finished A,B vs C,D; court 2 finished E,F vs G,H a bit earlier. A–D are at the front.
        var p = Enumerable.Range(0, 8).Select(i => Player(waitedMinutes: 20 - i)).ToList();
        var history = new PairingHistory();
        history.AddMatch([p[0].UserId, p[1].UserId], [p[2].UserId, p[3].UserId]); // newest first
        history.AddMatch([p[4].UserId, p[5].UserId], [p[6].UserId, p[7].UserId]);

        var lineup = Assert.Single(_matchmaker.FindLineups(Request(p, history)));
        var picked = lineup.TeamA.Concat(lineup.TeamB).ToHashSet();

        Assert.Contains(p[0].UserId, picked); // the front of the line still goes first
        Assert.False(picked.SetEquals(p.Take(4).Select(x => x.UserId)), "Same four as last game");
        Assert.Equal(2, picked.Count(id => p.Take(4).Any(x => x.UserId == id))); // a 2 + 2 mix of the two games
    }

    [Fact]
    public void Last_games_partners_and_opponents_are_kept_apart_when_possible()
    {
        // Only A's last game matters: A played with B against C,D. E,F,G are fresh.
        var p = Enumerable.Range(0, 7).Select(i => Player(waitedMinutes: 20 - i)).ToList();
        var history = new PairingHistory();
        history.AddMatch([p[0].UserId, p[1].UserId], [p[2].UserId, p[3].UserId]);

        var lineup = Assert.Single(_matchmaker.FindLineups(Request(p, history)));
        var picked = lineup.TeamA.Concat(lineup.TeamB).ToList();

        Assert.Contains(p[0].UserId, picked);
        Assert.DoesNotContain(picked, id => id == p[1].UserId || id == p[2].UserId || id == p[3].UserId);
    }

    [Fact]
    public void The_same_four_never_play_again_even_when_everyone_else_has_played_much_more()
    {
        // A–D just played and have 1 game; E–H have 6 games each. Fairness alone would put A–D back on.
        var p = Enumerable.Range(0, 4).Select(i => Player(waitedMinutes: 20 - i, games: 1))
            .Concat(Enumerable.Range(0, 4).Select(i => Player(waitedMinutes: 10 - i, games: 6))).ToList();
        var history = new PairingHistory();
        history.AddMatch([p[0].UserId, p[1].UserId], [p[2].UserId, p[3].UserId]);

        var lineup = Assert.Single(_matchmaker.FindLineups(Request(p, history)));

        Assert.False(lineup.TeamA.Concat(lineup.TeamB).ToHashSet().SetEquals(p.Take(4).Select(x => x.UserId)));
    }

    [Fact]
    public void When_only_the_same_four_are_free_they_play_with_new_partners()
    {
        var p = Enumerable.Range(0, 4).Select(i => Player(waitedMinutes: 10 - i)).ToList();
        var (a, b, c, d) = (p[0].UserId, p[1].UserId, p[2].UserId, p[3].UserId);
        var history = new PairingHistory();
        history.AddMatch([a, b], [c, d]);

        var lineup = Assert.Single(_matchmaker.FindLineups(Request(p, history)));

        // Still all four (the court isn't left empty) ...
        Assert.True(lineup.TeamA.Concat(lineup.TeamB).ToHashSet().SetEquals([a, b, c, d]));
        // ... but A is no longer with B, and C no longer with D.
        var teamOfA = lineup.TeamA.Contains(a) ? lineup.TeamA : lineup.TeamB;
        var teamOfC = lineup.TeamA.Contains(c) ? lineup.TeamA : lineup.TeamB;
        Assert.DoesNotContain(b, teamOfA);
        Assert.DoesNotContain(d, teamOfC);
    }

    [Fact]
    public void Fixed_partners_stay_together_even_back_to_back()
    {
        var a = new QueueCandidate(Guid.NewGuid(), 3, 1, Now.AddMinutes(-10));
        var b = new QueueCandidate(Guid.NewGuid(), 3, 1, Now.AddMinutes(-9), a.UserId);
        a = a with { PartnerId = b.UserId };
        var c = Player(8);
        var d = Player(7);
        var history = new PairingHistory();
        history.AddMatch([a.UserId, b.UserId], [c.UserId, d.UserId]);

        var lineup = Assert.Single(_matchmaker.FindLineups(Request([a, b, c, d], history)));

        var teamOfA = lineup.TeamA.Contains(a.UserId) ? lineup.TeamA : lineup.TeamB;
        Assert.Contains(b.UserId, teamOfA);
    }

    [Fact]
    public void Only_the_latest_game_counts_as_back_to_back()
    {
        var (a, b) = (Guid.NewGuid(), Guid.NewGuid());
        var (c, d) = (Guid.NewGuid(), Guid.NewGuid());
        var history = new PairingHistory();
        history.AddMatch([b, Guid.NewGuid()], [Guid.NewGuid(), Guid.NewGuid()]); // newest for B: someone else
        history.AddMatch([a, c], [d, Guid.NewGuid()]); // A's latest: with C, against D
        history.AddMatch([a, b], [Guid.NewGuid(), Guid.NewGuid()]); // older for both: A with B

        Assert.True(history.PlayedLastGameTogether(a, c));
        Assert.False(history.PlayedLastGameTogether(a, b));
    }
}
