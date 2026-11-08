using ChibiDink.Application.Matchmaking;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matchmaking;
using ChibiDink.Domain.Sessions;
using ChibiDink.Tests.Domain;

namespace ChibiDink.Tests.Application;

/// <summary>8 players, 2 courts: the two groups of four must not stay apart forever.</summary>
public sealed class MixHoldTests
{
    private static readonly DateTimeOffset Now = TestData.Now;

    [Fact]
    public void The_same_four_wait_for_the_other_court_while_it_is_mid_game()
    {
        var (session, _, p) = TestData.DoublesSession(players: 8, courts: 2);
        var history = new PairingHistory();
        history.AddMatch([p[0], p[1]], [p[2], p[3]]); // court 1 just finished
        var court2 = Match.Propose(session, session.GetCourt(2), [p[4], p[5]], [p[6], p[7]], Now, isManual: false);
        court2.Start(Now, byOrganizer: true);

        Assert.True(MixHold.ShouldWait(session, [p[0], p[1], p[2], p[3]], history, [court2], Now.AddMinutes(1)));
    }

    [Fact]
    public void A_mixed_group_never_waits()
    {
        var (session, _, p) = TestData.DoublesSession(players: 8, courts: 2);
        var history = new PairingHistory();
        history.AddMatch([p[0], p[1]], [p[2], p[3]]);
        var court2 = Match.Propose(session, session.GetCourt(2), [p[4], p[5]], [p[6], p[7]], Now, isManual: false);
        court2.Start(Now, byOrganizer: true);

        Assert.False(MixHold.ShouldWait(session, [p[0], p[1], p[2], p[4]], history, [court2], Now));
    }

    [Fact]
    public void No_waiting_when_no_other_game_is_underway_or_after_the_limit()
    {
        var (session, _, p) = TestData.DoublesSession(players: 8, courts: 2);
        var history = new PairingHistory();
        history.AddMatch([p[0], p[1]], [p[2], p[3]]);
        var notStarted = Match.Propose(session, session.GetCourt(2), [p[4], p[5]], [p[6], p[7]], Now, isManual: false);

        // The other court hasn't started: it's a whole game away, so they play now (with swapped partners).
        Assert.False(MixHold.ShouldWait(session, [p[0], p[1], p[2], p[3]], history, [notStarted], Now));

        notStarted.Start(Now, byOrganizer: true);
        // Waited the full limit already: play rather than sit any longer.
        Assert.False(MixHold.ShouldWait(session, [p[0], p[1], p[2], p[3]], history, [notStarted], Now + MixHold.Limit));
    }

    [Fact]
    public void Skill_based_only_waits_for_a_game_at_the_same_level()
    {
        var settings = new SessionSettings { Mode = QueueMode.SkillBased };
        var (session, _, p) = TestData.DoublesSession(players: 8, courts: 2, settings: settings);
        var history = new PairingHistory();
        history.AddMatch([p[0], p[1]], [p[2], p[3]]);
        var court2 = Match.Propose(session, session.GetCourt(2), [p[4], p[5]], [p[6], p[7]], Now, isManual: false);
        court2.Start(Now, byOrganizer: true);

        // Everyone is the same level here: worth waiting, they'll mix.
        Assert.True(MixHold.ShouldWait(session, [p[0], p[1], p[2], p[3]], history, [court2], Now));

        // Court 2 is a different level: waiting can't produce a mix, so play now (with swapped partners).
        foreach (var id in p.Skip(4)) session.GetParticipant(id).SetSkillEstimate(new SkillLevel(1));
        Assert.False(MixHold.ShouldWait(session, [p[0], p[1], p[2], p[3]], history, [court2], Now));
    }
}
