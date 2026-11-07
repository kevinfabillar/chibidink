using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Matchmaking;

/// <summary>A waiting player as the matchmaker sees them.</summary>
/// <param name="PartnerId">Fixed partner, when they're also a candidate: the two must play together, on one team.</param>
public sealed record QueueCandidate(
    Guid UserId,
    int Skill,
    int CompletedGames,
    DateTimeOffset WaitingSince,
    Guid? PartnerId = null);

/// <summary>Everything the matchmaker needs to fill courts. Contains no database or framework types.</summary>
public sealed record MatchmakingRequest(
    MatchFormat Format,
    int FreeCourts,
    IReadOnlyList<QueueCandidate> Candidates,
    PairingHistory History,
    DateTimeOffset Now,
    double SkillTolerance,
    TimeSpan WaitProtection,
    Sessions.QueueMode Mode = Sessions.QueueMode.FairMatch);

/// <summary>A group the matchmaker wants to put on a court.</summary>
public sealed record ProposedLineup(
    IReadOnlyList<Guid> TeamA,
    IReadOnlyList<Guid> TeamB,
    double SkillGap,
    bool ExceedsSkillTolerance);

/// <summary>Who has recently partnered with or played against whom in this session.</summary>
public sealed class PairingHistory
{
    private readonly Dictionary<(Guid, Guid), int> _partners = [];
    private readonly Dictionary<(Guid, Guid), int> _opponents = [];

    public static PairingHistory Empty => new();

    public void AddMatch(IReadOnlyList<Guid> teamA, IReadOnlyList<Guid> teamB)
    {
        AddPartners(teamA);
        AddPartners(teamB);
        foreach (var a in teamA)
            foreach (var b in teamB)
                Increment(_opponents, a, b);
    }

    public int PartnerCount(Guid a, Guid b) => _partners.GetValueOrDefault(Key(a, b));
    public int OpponentCount(Guid a, Guid b) => _opponents.GetValueOrDefault(Key(a, b));

    private void AddPartners(IReadOnlyList<Guid> team)
    {
        for (var i = 0; i < team.Count; i++)
            for (var j = i + 1; j < team.Count; j++)
                Increment(_partners, team[i], team[j]);
    }

    private static void Increment(Dictionary<(Guid, Guid), int> map, Guid a, Guid b)
    {
        var key = Key(a, b);
        map[key] = map.GetValueOrDefault(key) + 1;
    }

    private static (Guid, Guid) Key(Guid a, Guid b) => a.CompareTo(b) < 0 ? (a, b) : (b, a);
}

public interface IMatchmakingStrategy
{
    /// <summary>Returns at most one lineup per free court. Never uses a player twice.</summary>
    IReadOnlyList<ProposedLineup> FindLineups(MatchmakingRequest request);
}
