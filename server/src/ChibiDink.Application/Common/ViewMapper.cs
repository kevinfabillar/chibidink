using ChibiDink.Application.Contracts;
using ChibiDink.Domain.Cosmetics;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Common;

/// <summary>Turns domain objects into the shapes the client draws. No business rules live here.</summary>
public static class ViewMapper
{
    public static PlayerCardDto Card(Guid userId, IReadOnlyDictionary<Guid, PlayerProfile> profiles) =>
        profiles.TryGetValue(userId, out var p)
            ? Card(p)
            : new PlayerCardDto(userId, "Player", 1, Appearance.StarterFor(userId), Loadout.Starter);

    public static PlayerCardDto Card(PlayerProfile p) =>
        new(p.UserId, p.DisplayName, p.CharacterLevel, p.Appearance, p.Loadout);

    public static MatchDto Match(Match m, IReadOnlyDictionary<Guid, PlayerProfile> profiles, Guid viewerId, bool viewerIsOrganizer)
    {
        MatchPlayerDto Player(MatchParticipant p) => new(Card(p.UserId, profiles), p.Confirmation);

        var result = m.Result is null
            ? null
            : new MatchResultDto(m.Result.TeamAScore, m.Result.TeamBScore, m.Result.Winner,
                m.Result.ReportedById, m.Result.VerifiedAt is not null, m.Result.Notes);

        return new MatchDto(
            m.Id, m.CourtNumber, m.Format, m.Status, m.IsManual, m.IsMixedSkill,
            m.CreatedAt, m.ConfirmationDeadline, m.StartedAt, m.EndedAt,
            m.TeamA.Select(Player).ToList(), m.TeamB.Select(Player).ToList(),
            result, m.FindPlayer(viewerId)?.Team, m.CanVerify(viewerId, viewerIsOrganizer), m.CancelReason);
    }

    /// <summary>A completed match from one player's point of view.</summary>
    public static MatchHistoryItemDto History(Match m, Guid userId, IReadOnlyDictionary<Guid, PlayerProfile> profiles)
    {
        var myTeam = m.FindPlayer(userId)!.Team;
        var result = m.Result!;
        var (mine, theirs) = myTeam == Team.A ? (result.TeamAScore, result.TeamBScore) : (result.TeamBScore, result.TeamAScore);
        string Name(Guid id) => Card(id, profiles).DisplayName;

        return new MatchHistoryItemDto(
            m.Id, m.SessionId, m.EndedAt ?? m.CreatedAt, m.Format, m.CourtNumber,
            result.Winner == myTeam, mine, theirs,
            m.Participants.Where(p => p.Team == myTeam && p.UserId != userId).Select(p => Name(p.UserId)).ToList(),
            m.Participants.Where(p => p.Team != myTeam).Select(p => Name(p.UserId)).ToList());
    }

    public static SessionSummaryDto Summary(PlaySession s, Guid viewerId) => new(
        s.Id, s.Title, s.Location, s.ScheduledAt, s.Format, s.Status,
        s.Courts.Count, s.Participants.Count(p => p.Status != ParticipantStatus.Left), s.IsOrganizer(viewerId),
        s.FindParticipant(viewerId)?.Status);
}
