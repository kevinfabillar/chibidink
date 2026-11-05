using ChibiDink.Domain.Common;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Tests.Domain;

internal static class TestData
{
    public static readonly DateTimeOffset Now = new(2026, 11, 2, 18, 0, 0, TimeSpan.Zero);

    public static (PlaySession Session, Guid Organizer, List<Guid> Players) DoublesSession(
        int players = 8, int courts = 2, SessionSettings? settings = null)
    {
        var organizer = Guid.NewGuid();
        var session = PlaySession.Create(organizer, "Friday Open Play", "Riverside Courts", Now,
            MatchFormat.Doubles, courts, settings ?? new SessionSettings(), "ABC234", new SkillLevel(3), Now);

        var ids = Enumerable.Range(0, players).Select(_ => Guid.NewGuid()).ToList();
        foreach (var id in ids)
            session.Join(id, new SkillLevel(3), Now).EnterQueue(Now);
        return (session, organizer, ids);
    }
}
