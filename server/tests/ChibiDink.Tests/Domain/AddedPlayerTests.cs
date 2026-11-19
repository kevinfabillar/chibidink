using ChibiDink.Domain.Common;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Tests.Domain;

/// <summary>Players the organizer adds by name (no phone) are checked in to the queue straight away.</summary>
public sealed class AddedPlayerTests
{
    [Fact]
    public void An_added_player_is_checked_in()
    {
        var (session, _, _) = TestData.DoublesSession();
        var added = Guid.NewGuid();

        session.Join(added, new SkillLevel(1), TestData.Now, byOrganizer: true).EnterQueue(TestData.Now);

        Assert.Equal(ParticipantStatus.Waiting, session.GetParticipant(added).Status);
    }

    [Fact]
    public void The_organizer_can_add_players_when_the_session_is_not_taking_new_ones()
    {
        var (session, _, _) = TestData.DoublesSession(players: 0);
        session.UpdateSettings(new SessionSettings { OpenAdmission = false });

        Assert.ThrowsAny<Exception>(() => session.Join(Guid.NewGuid(), new SkillLevel(2), TestData.Now));
        var added = session.Join(Guid.NewGuid(), new SkillLevel(2), TestData.Now, byOrganizer: true);
        Assert.NotNull(added);
    }
}
