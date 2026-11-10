using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Scoring;
using ChibiDink.Domain.Social;

namespace ChibiDink.Tests.Domain;

public sealed class KudosTests
{
    private static readonly IScoringRule Rule = new PlayToTargetScoringRule(11, 2);
    private static readonly DateTimeOffset Now = TestData.Now;

    /// <summary>A verified match p0 & p1 vs p2 & p3 that ended at Now + 16 min.</summary>
    private static (Match Match, List<Guid> Players) FinishedMatch()
    {
        var (session, _, p) = TestData.DoublesSession();
        var match = Match.Propose(session, session.GetCourt(1), p[..2], p[2..4], Now, isManual: false);
        match.Start(Now, byOrganizer: false);
        match.ReportResult(Rule, 11, 7, p[0], null, Now.AddMinutes(15));
        match.Verify(session, p[2], Now.AddMinutes(16));
        return (match, p);
    }

    [Fact]
    public void Players_in_the_match_give_teammates_and_opponents_skill_and_character_kudos()
    {
        var (match, p) = FinishedMatch();

        var dinks = Kudos.Give(match, p[0], p[2], KudosKind.Dinks, Now.AddMinutes(20));
        var partner = Kudos.Give(match, p[0], p[1], KudosKind.GreatPartner, Now.AddMinutes(20));

        Assert.Equal(match.SessionId, dinks.SessionId);
        Assert.Equal(KudosKind.GreatPartner, partner.Kind);
    }

    [Fact]
    public void Switching_keeps_one_kudos_per_person_per_session()
    {
        var (match, p) = FinishedMatch();
        var kudos = Kudos.Give(match, p[0], p[2], KudosKind.Volleys, Now.AddMinutes(20));

        kudos.Change(match, KudosKind.Smashes, Now.AddMinutes(21));

        Assert.Equal(KudosKind.Smashes, kudos.Kind);
        Assert.Equal(match.SessionId, kudos.SessionId);
    }

    [Fact]
    public void Only_players_of_a_finished_match_within_a_day_and_never_to_yourself()
    {
        var (match, p) = FinishedMatch();
        var later = Now.AddMinutes(20);

        Assert.Throws<DomainException>(() => Kudos.Give(match, p[0], p[0], KudosKind.Dinks, later)); // yourself
        Assert.Throws<DomainException>(() => Kudos.Give(match, p[5], p[0], KudosKind.Dinks, later)); // not in it
        Assert.Throws<DomainException>(() => Kudos.Give(match, p[0], p[5], KudosKind.Dinks, later)); // not in it
        Assert.Throws<DomainException>(() => Kudos.Give(match, p[0], p[1], KudosKind.Dinks, Now.AddMinutes(16) + Kudos.Window + TimeSpan.FromMinutes(1)));
        Assert.Throws<DomainException>(() => Kudos.EnsureCanTakeBack(match, p[0], p[1], Now.AddMinutes(16) + Kudos.Window + TimeSpan.FromMinutes(1)));

        var (session, _, q) = TestData.DoublesSession();
        var unfinished = Match.Propose(session, session.GetCourt(1), q[..2], q[2..4], Now, isManual: false);
        Assert.Throws<DomainException>(() => Kudos.Give(unfinished, q[0], q[1], KudosKind.Dinks, Now));
    }

    [Fact]
    public void Street_cred_rewards_many_different_people_over_one_friend_repeating()
    {
        // Ten kudos from one friend vs ten kudos from ten different players.
        Assert.Equal(10, Kudos.StreetCred(received: 10, uniqueGivers: 1));
        Assert.Equal(100, Kudos.StreetCred(received: 10, uniqueGivers: 10));
    }
}
