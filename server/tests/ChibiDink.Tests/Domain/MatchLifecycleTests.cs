using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Scoring;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Tests.Domain;

public sealed class MatchLifecycleTests
{
    private static readonly IScoringRule Rule = new PlayToTargetScoringRule(11, 2);

    /// <summary>Most tests here cover the optional accept-a-call flow, so they turn a confirmation window on.</summary>
    private static (PlaySession session, Guid organizer, List<Guid> players, Match match) NewMatch()
    {
        var (session, organizer, players) = TestData.DoublesSession(settings: new SessionSettings { ConfirmationWindowSeconds = 120 });
        var match = Match.Propose(session, session.GetCourt(1), players[..2], players[2..4], TestData.Now, isManual: false);
        return (session, organizer, players, match);
    }

    [Fact]
    public void Automatic_queueing_puts_the_group_on_court_ready_to_start()
    {
        var (session, _, players) = TestData.DoublesSession();

        var match = Match.Propose(session, session.GetCourt(1), players[..2], players[2..4], TestData.Now, isManual: false);

        Assert.Equal(MatchStatus.Ready, match.Status);
        Assert.Null(match.StartedAt);
        Assert.Null(match.ConfirmationDeadline);
        Assert.Equal(match.Id, session.GetCourt(1).CurrentMatchId);
        Assert.All(players[..4], p => Assert.Equal(ParticipantStatus.InMatch, session.GetParticipant(p).Status));

        match.Start(TestData.Now.AddMinutes(1), byOrganizer: true);
        Assert.Equal(MatchStatus.Playing, match.Status);
        Assert.Equal(TestData.Now.AddMinutes(1), match.StartedAt);
    }

    [Fact]
    public void A_score_for_a_game_nobody_started_still_counts()
    {
        var (session, organizer, players) = TestData.DoublesSession();
        var match = Match.Propose(session, session.GetCourt(1), players[..2], players[2..4], TestData.Now, isManual: false);

        match.ReportResult(Rule, 11, 7, organizer, null, TestData.Now.AddMinutes(12));

        Assert.Equal(MatchStatus.PendingResult, match.Status);
        Assert.NotNull(match.StartedAt);
    }

    [Fact]
    public void Proposing_reserves_players_and_court()
    {
        var (session, _, players, match) = NewMatch();

        Assert.Equal(MatchStatus.AwaitingConfirmation, match.Status);
        Assert.Equal(match.Id, session.GetCourt(1).CurrentMatchId);
        Assert.All(players[..4], p => Assert.Equal(ParticipantStatus.InMatch, session.GetParticipant(p).Status));
    }

    [Fact]
    public void A_reserved_player_cannot_be_booked_twice()
    {
        var (session, _, players, _) = NewMatch();
        Assert.Throws<DomainException>(() =>
            Match.Propose(session, session.GetCourt(2), [players[0], players[4]], players[5..7], TestData.Now, false));
    }

    [Fact]
    public void All_accepting_makes_it_ready()
    {
        var (_, _, players, match) = NewMatch();
        foreach (var p in players[..4]) match.Accept(p);
        Assert.Equal(MatchStatus.Ready, match.Status);
    }

    [Fact]
    public void Declining_cancels_sends_the_decliner_to_the_back_and_keeps_others_priority()
    {
        var (session, _, players, match) = NewMatch();
        var originalWait = session.GetParticipant(players[1]).WaitingSince;

        match.Decline(session, players[0], TestData.Now.AddMinutes(1));

        Assert.Equal(MatchStatus.Cancelled, match.Status);
        Assert.Null(session.GetCourt(1).CurrentMatchId);
        Assert.Equal(ParticipantStatus.Waiting, session.GetParticipant(players[0]).Status);
        Assert.Equal(TestData.Now.AddMinutes(1), session.GetParticipant(players[0]).WaitingSince);
        Assert.Equal(ParticipantStatus.Waiting, session.GetParticipant(players[1]).Status);
        Assert.Equal(originalWait, session.GetParticipant(players[1]).WaitingSince);
        Assert.All(match.Participants, p => Assert.False(p.IsActive));
    }

    [Fact]
    public void Expired_confirmation_steps_away_only_silent_players()
    {
        var (session, _, players, match) = NewMatch();
        match.Accept(players[0]);

        match.ExpireConfirmation(session, match.ConfirmationDeadline!.Value);

        Assert.Equal(ParticipantStatus.Waiting, session.GetParticipant(players[0]).Status);
        Assert.Equal(ParticipantStatus.Paused, session.GetParticipant(players[1]).Status);
    }

    [Fact]
    public void Verified_result_updates_session_records_exactly_once()
    {
        var (session, organizer, players, match) = NewMatch();
        foreach (var p in players[..4]) match.Accept(p);
        match.Start(TestData.Now, byOrganizer: false);
        match.ReportResult(Rule, 11, 7, players[0], null, TestData.Now.AddMinutes(15));

        var outcome = match.Verify(session, players[2], TestData.Now.AddMinutes(16)); // opposing team confirms

        Assert.Equal(MatchStatus.Completed, match.Status);
        Assert.Equal(players[..2], outcome.Winners);
        Assert.Equal(1, session.GetParticipant(players[0]).Wins);
        Assert.Equal(1, session.GetParticipant(players[2]).Losses);
        Assert.All(players[..4], p => Assert.Equal(1, session.GetParticipant(p).CompletedGames));
        Assert.Null(session.GetCourt(1).CurrentMatchId);

        Assert.Throws<DomainException>(() => match.Verify(session, organizer, TestData.Now.AddMinutes(17)));
        Assert.All(players[..4], p => Assert.Equal(1, session.GetParticipant(p).CompletedGames));
    }

    [Fact]
    public void Reporting_team_cannot_verify_its_own_score()
    {
        var (session, _, players, match) = NewMatch();
        match.Start(TestData.Now, byOrganizer: true);
        match.ReportResult(Rule, 11, 3, players[0], null, TestData.Now);

        Assert.Throws<ForbiddenException>(() => match.Verify(session, players[1], TestData.Now));
    }

    [Fact]
    public void Replacing_a_player_returns_them_to_queue_with_priority()
    {
        var (session, _, players, match) = NewMatch();
        var originalWait = session.GetParticipant(players[0]).WaitingSince;

        match.ReplacePlayer(session, players[0], players[5], TestData.Now.AddMinutes(2));

        Assert.False(match.Involves(players[0]));
        Assert.True(match.Involves(players[5]));
        Assert.Equal(ParticipantStatus.Waiting, session.GetParticipant(players[0]).Status);
        Assert.Equal(originalWait, session.GetParticipant(players[0]).WaitingSince);
        Assert.Equal(ParticipantStatus.InMatch, session.GetParticipant(players[5]).Status);
    }

    [Fact]
    public void Session_cannot_close_with_a_match_on_court()
    {
        var (session, _, _, _) = NewMatch();
        Assert.Throws<DomainException>(() => session.Close(TestData.Now));
    }
}
