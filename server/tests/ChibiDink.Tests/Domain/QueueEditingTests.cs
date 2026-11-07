using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Tests.Domain;

/// <summary>Organizer edits to the queue (lined-up groups) and swaps between courts during play.</summary>
public sealed class QueueEditingTests
{
    [Fact]
    public void A_planned_group_can_hold_a_player_who_is_still_on_court_and_waits_for_them()
    {
        var (session, _, p) = TestData.DoublesSession(players: 8, courts: 1);
        Match.Propose(session, session.GetCourt(1), p[..2], p[2..4], TestData.Now, isManual: false);

        session.SetPlannedGroups([new PlannedGroup([p[0], p[4]], [p[5], p[6]])]);

        Assert.Single(session.PlannedGroups);
        Assert.False(session.IsPlannedGroupReady(session.PlannedGroups[0]));
    }

    [Fact]
    public void A_player_cannot_be_in_two_planned_groups()
    {
        var (session, _, p) = TestData.DoublesSession(players: 8);
        Assert.Throws<DomainException>(() => session.SetPlannedGroups([
            new PlannedGroup([p[0], p[1]], [p[2], p[3]]),
            new PlannedGroup([p[0], p[4]], [p[5], p[6]]),
        ]));
    }

    [Fact]
    public void Checked_out_players_cannot_be_planned_and_checking_out_drops_their_group()
    {
        var (session, _, p) = TestData.DoublesSession(players: 8);
        session.GetParticipant(p[7]).Pause();
        Assert.Throws<DomainException>(() => session.SetPlannedGroups([new PlannedGroup([p[0], p[1]], [p[2], p[7]])]));

        session.SetPlannedGroups([new PlannedGroup([p[0], p[1]], [p[2], p[3]])]);
        session.GetParticipant(p[3]).Pause();

        Assert.True(session.PrunePlannedGroups());
        Assert.Empty(session.PlannedGroups);
    }

    [Fact]
    public void Starting_a_group_removes_it_from_the_plan()
    {
        var (session, _, p) = TestData.DoublesSession(players: 8);
        session.SetPlannedGroups([new PlannedGroup([p[0], p[1]], [p[2], p[3]]), new PlannedGroup([p[4], p[5]], [p[6], p[7]])]);

        session.RemovePlannedGroupsWith(p[..4]);

        Assert.Equal([p[4], p[5]], session.PlannedGroups.Single().TeamA);
    }

    [Fact]
    public void Setting_a_lineup_brings_in_waitlist_and_other_court_players_and_changes_sides()
    {
        var (session, _, p) = TestData.DoublesSession(players: 10, courts: 2);
        var court1 = Match.Propose(session, session.GetCourt(1), p[..2], p[2..4], TestData.Now, isManual: false);
        var court2 = Match.Propose(session, session.GetCourt(2), p[4..6], p[6..8], TestData.Now, isManual: false);

        // Spots were [p0, p1 | p2, p3]. Now [p0, p3 | p8, p6]: p3 moves to side A, p8 (waitlist) takes p2's spot,
        // and p6 (court 2) takes the remaining spot, so p1 trades over to court 2.
        court1.SetLineup(session, [p[0], p[3]], [p[8], p[6]], [court1, court2], TestData.Now);

        Assert.Equal([p[0], p[3]], court1.TeamA.Select(x => x.UserId).OrderBy(x => p.IndexOf(x)));
        Assert.Equal([p[6], p[8]], court1.TeamB.Select(x => x.UserId).OrderBy(x => p.IndexOf(x)));
        Assert.Equal(ParticipantStatus.Waiting, session.GetParticipant(p[2]).Status); // back to the waitlist
        Assert.True(court2.Involves(p[1]));                                          // traded to court 2
        Assert.Equal(Team.B, court2.FindPlayer(p[1])!.Team);                         // in p6's old spot
        Assert.Equal(MatchStatus.Ready, court1.Status);
    }

    [Fact]
    public void A_lineup_cannot_pick_the_same_player_twice()
    {
        var (session, _, p) = TestData.DoublesSession(players: 6, courts: 1);
        var match = Match.Propose(session, session.GetCourt(1), p[..2], p[2..4], TestData.Now, isManual: false);
        Assert.Throws<DomainException>(() => match.SetLineup(session, [p[0], p[0]], [p[2], p[3]], [match], TestData.Now));
    }

    [Fact]
    public void Players_can_swap_between_two_courts_during_play()
    {
        var (session, _, p) = TestData.DoublesSession(players: 8, courts: 2);
        var court1 = Match.Propose(session, session.GetCourt(1), p[..2], p[2..4], TestData.Now, isManual: false);
        var court2 = Match.Propose(session, session.GetCourt(2), p[4..6], p[6..8], TestData.Now, isManual: false);

        court1.ExchangePlayer(court2, p[0], p[6]);

        Assert.Equal(Team.A, court1.FindPlayer(p[6])!.Team);
        Assert.Equal(Team.B, court2.FindPlayer(p[0])!.Team);
        Assert.Equal(court2.Id, court2.FindPlayer(p[0])!.MatchId);
        Assert.False(court1.Involves(p[0]));
        Assert.Equal(4, court1.Participants.Count);
        Assert.Equal(4, court2.Participants.Count);
        Assert.All(p, id => Assert.Equal(ParticipantStatus.InMatch, session.GetParticipant(id).Status));
    }
}
