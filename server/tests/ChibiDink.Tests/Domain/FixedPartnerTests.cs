using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matchmaking;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Tests.Domain;

public sealed class FixedPartnerTests
{
    private readonly IMatchmakingStrategy _matchmaker = new FairRotationMatchmaker();
    private static readonly DateTimeOffset Now = TestData.Now;

    private static MatchmakingRequest Request(IReadOnlyList<QueueCandidate> players, int courts = 1) =>
        new(MatchFormat.Doubles, courts, players, PairingHistory.Empty, Now, SkillTolerance: 1.0, TimeSpan.FromMinutes(20));

    private static (QueueCandidate, QueueCandidate) Pair(int waitedA, int waitedB)
    {
        var (a, b) = (Guid.NewGuid(), Guid.NewGuid());
        return (new QueueCandidate(a, 3, 0, Now.AddMinutes(-waitedA), b), new QueueCandidate(b, 3, 0, Now.AddMinutes(-waitedB), a));
    }

    private static QueueCandidate Solo(int waited) => new(Guid.NewGuid(), 3, 0, Now.AddMinutes(-waited));

    [Fact]
    public void Partners_go_on_court_together_on_the_same_team_even_if_one_is_far_back_in_line()
    {
        var (front, back) = Pair(waitedA: 19, waitedB: 0);
        var others = Enumerable.Range(1, 12).Select(i => Solo(waited: 18 - i)).ToList();

        var lineup = Assert.Single(_matchmaker.FindLineups(Request([front, .. others, back])));

        var team = lineup.TeamA.Contains(front.UserId) ? lineup.TeamA : lineup.TeamB;
        Assert.Contains(back.UserId, team);
    }

    [Fact]
    public void A_partner_whose_other_half_is_not_waiting_plays_solo()
    {
        var lonely = new QueueCandidate(Guid.NewGuid(), 3, 0, Now.AddMinutes(-10), PartnerId: Guid.NewGuid());
        var others = Enumerable.Range(0, 3).Select(Solo).ToList();

        var lineup = Assert.Single(_matchmaker.FindLineups(Request([lonely, .. others])));

        Assert.Contains(lonely.UserId, lineup.TeamA.Concat(lineup.TeamB));
    }

    [Fact]
    public void Two_pairs_fill_a_court_and_never_get_split()
    {
        var (a1, a2) = Pair(10, 9);
        var (b1, b2) = Pair(8, 7);

        var lineup = Assert.Single(_matchmaker.FindLineups(Request([a1, a2, b1, b2])));

        Assert.True(lineup.TeamA.ToHashSet().SetEquals([a1.UserId, a2.UserId]) || lineup.TeamB.ToHashSet().SetEquals([a1.UserId, a2.UserId]));
    }

    [Fact]
    public void When_the_front_player_cannot_join_the_next_in_line_anchor_instead()
    {
        // Front player alone; behind them only three pairs: four of them still make a court.
        var solo = Solo(30);
        var (a1, a2) = Pair(20, 20);
        var (b1, b2) = Pair(10, 10);

        var lineup = Assert.Single(_matchmaker.FindLineups(Request([solo, a1, a2, b1, b2])));

        Assert.DoesNotContain(solo.UserId, lineup.TeamA.Concat(lineup.TeamB));
    }

    [Fact]
    public void A_big_session_with_many_pairs_is_matched_quickly()
    {
        // 80 waiting, a third of them in fixed pairs, 6 courts: runs on every court change, so it must stay fast.
        var players = new List<QueueCandidate>();
        for (var i = 0; i < 14; i++)
        {
            var (a, b) = Pair(i, i);
            players.AddRange([a, b]);
        }
        players.AddRange(Enumerable.Range(0, 52).Select(Solo));

        var watch = System.Diagnostics.Stopwatch.StartNew();
        var lineups = _matchmaker.FindLineups(Request(players, courts: 6));
        watch.Stop();

        Assert.Equal(6, lineups.Count);
        Assert.True(watch.ElapsedMilliseconds < 250, $"Took {watch.ElapsedMilliseconds} ms");
    }

    [Fact]
    public void Pairing_frees_the_previous_partners()
    {
        var (session, _, p) = TestData.DoublesSession(players: 4);
        session.SetPartner(p[0], p[1]);
        session.SetPartner(p[0], p[2]);

        Assert.Equal(p[2], session.GetParticipant(p[0]).PartnerId);
        Assert.Equal(p[0], session.GetParticipant(p[2]).PartnerId);
        Assert.Null(session.GetParticipant(p[1]).PartnerId);

        session.SetPartner(p[2], null);
        Assert.Null(session.GetParticipant(p[0]).PartnerId);
        Assert.Throws<DomainException>(() => session.SetPartner(p[3], p[3]));
    }
}
