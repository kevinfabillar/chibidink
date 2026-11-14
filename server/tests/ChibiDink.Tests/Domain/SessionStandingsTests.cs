using ChibiDink.Domain.Sessions;

namespace ChibiDink.Tests.Domain;

public sealed class SessionStandingsTests
{
    private static readonly Guid P1 = Guid.NewGuid(), P2 = Guid.NewGuid(), Weak1 = Guid.NewGuid(), Weak2 = Guid.NewGuid(),
        Strong1 = Guid.NewGuid(), Strong2 = Guid.NewGuid(), X1 = Guid.NewGuid(), X2 = Guid.NewGuid(), X3 = Guid.NewGuid(), X4 = Guid.NewGuid();

    private static GameResult Game(Guid[] winners, Guid[] losers, int winnerScore = 11, int loserScore = 5) =>
        new(winners, losers, winnerScore, loserScore);

    private static PlayerRecord Record(Guid id, IReadOnlyList<GameResult> games) =>
        new(id, games.Count(g => g.Winners.Contains(id)), games.Count(g => g.Losers.Contains(id)));

    private static IReadOnlyList<Standing> Rank(IReadOnlyList<GameResult> games, params Guid[] players) =>
        SessionStandings.Rank(players.Select(p => Record(p, games)).ToList(), games);

    [Fact]
    public void Most_wins_comes_first()
    {
        var games = new[] { Game([P1, X1], [P2, X2]), Game([P1, X3], [P2, X4]) };

        var standings = Rank(games, P1, P2);

        Assert.Equal(P1, standings[0].UserId);
        Assert.Equal(1, standings[0].Rank);
        Assert.Equal(2, standings[1].Rank);
        Assert.Null(standings[0].TieBreak); // decided by wins, not a tiebreaker
    }

    [Fact]
    public void With_the_same_record_winning_with_weaker_partners_ranks_higher()
    {
        // P1 wins with Weak1, who loses everything else. P2 wins with Strong1, who wins everything else.
        // Both finish 1–1.
        var games = new[]
        {
            Game([P1, Weak1], [X1, X2]),
            Game([P2, Strong1], [X3, X4]),
            Game([X1, X2], [P1, X3]),
            Game([X3, X4], [P2, X1]),
            Game([X1, X3], [Weak1, X2]),
            Game([Strong1, X2], [X3, X4]),
        };

        var standings = Rank(games, P2, P1);

        Assert.Equal(P1, standings[0].UserId);
        Assert.Equal(SessionStandings.TougherPartners, standings[0].TieBreak);
        Assert.False(standings[0].Tied);
        Assert.True(standings[0].Rank < standings[1].Rank);
    }

    [Fact]
    public void A_partner_is_judged_without_the_games_they_played_together()
    {
        // Weak1's only win is with P1; without it they've lost every game, so P1 still gets the credit.
        var games = new[]
        {
            Game([P1, Weak1], [X1, X2]),
            Game([P2, X3], [X1, X2]),
            Game([X1, X2], [Weak1, X4]),
            Game([X3, X4], [X1, X2]),
        };

        var standings = Rank(games, P1, P2);

        Assert.Equal(P1, standings[0].UserId);
        Assert.Equal(SessionStandings.TougherPartners, standings[0].TieBreak);
    }

    [Fact]
    public void Then_beating_stronger_opponents()
    {
        // Same partner for both (so partners can't decide); P1 beat the strong pair, P2 the weak pair.
        var games = new[]
        {
            Game([P1, X1], [Strong1, Strong2]),
            Game([P2, X1], [Weak1, Weak2]),
            Game([Strong1, Strong2], [X3, X4]),
            Game([X3, X4], [Weak1, Weak2]),
        };

        var standings = Rank(games, P2, P1);

        Assert.Equal(P1, standings[0].UserId);
        Assert.Equal(SessionStandings.StrongerOpponents, standings[0].TieBreak);
    }

    [Fact]
    public void Then_point_difference()
    {
        // Same partner, same opponents: only the scores differ.
        var games = new[] { Game([P1, X1], [X2, X3], 11, 2), Game([P2, X1], [X2, X3], 11, 9) };

        var standings = Rank(games, P2, P1);

        Assert.Equal(P1, standings[0].UserId);
        Assert.Equal(SessionStandings.PointDifference, standings[0].TieBreak);
    }

    [Fact]
    public void Level_on_everything_shares_a_rank()
    {
        var games = new[] { Game([P1, X1], [X2, X3]), Game([P2, X1], [X2, X3]) };

        var standings = Rank(games, P1, P2, X2);

        Assert.All(standings.Where(s => s.UserId == P1 || s.UserId == P2), s =>
        {
            Assert.Equal(1, s.Rank);
            Assert.True(s.Tied);
        });
        Assert.Equal(3, standings.Single(s => s.UserId == X2).Rank); // the next rank skips the shared places
    }

    [Fact]
    public void Players_without_a_finished_game_are_not_ranked()
    {
        var games = new[] { Game([P1, X1], [X2, X3]) };

        var standings = Rank(games, P1, P2);

        Assert.DoesNotContain(standings, s => s.UserId == P2);
    }
}
