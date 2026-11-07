using ChibiDink.Application.Progression;
using ChibiDink.Domain.Common;
using ChibiDink.Domain.Cosmetics;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Progression;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Contracts;

// ---- Requests -------------------------------------------------------------------------------

public sealed record CreateSessionRequest(
    string Title, string Location, DateTimeOffset ScheduledAt,
    MatchFormat Format, int CourtCount, SessionSettings? Settings);

public sealed record UpdateSessionRequest(string Title, string Location, DateTimeOffset ScheduledAt, SessionSettings Settings);

public sealed record CreateManualMatchRequest(int CourtNumber, Guid[] TeamA, Guid[] TeamB);
public sealed record ReplacePlayerRequest(Guid OutgoingUserId, Guid IncomingUserId);
public sealed record SwitchTeamsRequest(Guid FirstUserId, Guid SecondUserId);
public sealed record MoveMatchRequest(int CourtNumber);
/// <summary>The players on a court, side by side. Newcomers come from the waitlist or trade places with another court.</summary>
public sealed record SetLineupRequest(Guid[] TeamA, Guid[] TeamB);
public sealed record SetPartnerRequest(Guid? PartnerId);
public sealed record PlannedGroupRequest(Guid[] TeamA, Guid[] TeamB);
public sealed record SetPlannedGroupsRequest(PlannedGroupRequest[] Groups);

public sealed record ReportResultRequest(int TeamAScore, int TeamBScore, string? Notes);
public sealed record ReasonRequest(string? Reason);
public sealed record SetSkillRequest(int Skill);
public sealed record CourtAvailabilityRequest(bool Available);
public sealed record UpdateProfileRequest(string DisplayName, int SkillEstimate);

// ---- Shared views ---------------------------------------------------------------------------

/// <summary>Enough to draw a player's character anywhere in the app.</summary>
public sealed record PlayerCardDto(Guid UserId, string DisplayName, int CharacterLevel, Appearance Appearance, Loadout Loadout);

public sealed record StatsDto(
    int Matches, int Wins, int Losses, double? WinRate,
    int SinglesWins, int SinglesLosses, int DoublesWins, int DoublesLosses)
{
    public static StatsDto From(PlayerStatistics s) => new(
        s.MatchesPlayed, s.Wins, s.Losses, s.WinRate,
        s.SinglesWins, s.SinglesLosses, s.DoublesWins, s.DoublesLosses);
}

/// <summary>Character level, XP within the level, and coin balance.</summary>
public sealed record ProgressDto(int Level, int Experience, int LevelStartXp, int NextLevelXp, int Coins)
{
    public static ProgressDto From(PlayerProfile p) => new(
        p.CharacterLevel, p.Experience,
        LevelCurve.TotalXpFor(p.CharacterLevel), LevelCurve.TotalXpFor(p.CharacterLevel + 1),
        p.Coins);
}

// ---- Sessions -------------------------------------------------------------------------------

public sealed record SessionSummaryDto(
    Guid Id, string Title, string Location, DateTimeOffset ScheduledAt,
    MatchFormat Format, SessionStatus Status, int CourtCount, int PlayerCount, bool IsOrganizer,
    ParticipantStatus? MyStatus);

/// <summary>Public invitation info. Visible to guests before they sign in.</summary>
public sealed record InvitePreviewDto(
    Guid Id, string Title, string Location, DateTimeOffset ScheduledAt,
    MatchFormat Format, SessionStatus Status, int CourtCount, int PlayerCount, string OrganizerName);

public sealed record SessionDetailDto(
    Guid Id, string Title, string Location, DateTimeOffset ScheduledAt,
    MatchFormat Format, SessionStatus Status, string InviteCode,
    SessionSettings Settings, bool IsOrganizer,
    ParticipantDto? Me, MatchDto? MyMatch,
    IReadOnlyList<CourtDto> Courts,
    IReadOnlyList<ParticipantDto> Participants,
    IReadOnlyList<MatchHistoryItemDto> MyGames,
    IReadOnlyList<UpNextDto> UpNext);

/// <summary>A predicted group of four, in the order they will go on court. `Tier` is set in skill-based sessions.</summary>
/// <param name="IsPlanned">Set up by the organizer (kept as edited) rather than picked by the matchmaker.</param>
/// <param name="IsReady">All four are off court and waiting, so the group can start now.</param>
public sealed record UpNextDto(
    int Order, IReadOnlyList<PlayerCardDto> TeamA, IReadOnlyList<PlayerCardDto> TeamB, string? Tier, bool IsMixedSkill,
    bool IsPlanned, bool IsReady);

public sealed record CourtDto(int Number, CourtStatus Status, MatchDto? Match);

public sealed record ParticipantDto(
    PlayerCardDto Player, SessionRole Role, ParticipantStatus Status, int SkillEstimate,
    DateTimeOffset? WaitingSince, int? QueuePosition,
    int CompletedGames, int Wins, int Losses, double? WinRate,
    Guid? PartnerId);

// ---- Matches --------------------------------------------------------------------------------

public sealed record MatchPlayerDto(PlayerCardDto Player, ConfirmationStatus Confirmation);

public sealed record MatchResultDto(int TeamAScore, int TeamBScore, Team Winner, Guid ReportedById, bool Verified, string? Notes);

public sealed record MatchDto(
    Guid Id, int CourtNumber, MatchFormat Format, MatchStatus Status,
    bool IsManual, bool IsMixedSkill,
    DateTimeOffset CreatedAt, DateTimeOffset? ConfirmationDeadline,
    DateTimeOffset? StartedAt, DateTimeOffset? EndedAt,
    IReadOnlyList<MatchPlayerDto> TeamA, IReadOnlyList<MatchPlayerDto> TeamB,
    MatchResultDto? Result, Team? MyTeam, bool CanVerify, string? CancelReason);

public sealed record AuditEntryDto(Guid? MatchId, string ActorName, string Action, string Details, DateTimeOffset At);

// ---- Profiles -------------------------------------------------------------------------------

public sealed record MatchHistoryItemDto(
    Guid MatchId, Guid SessionId, DateTimeOffset PlayedAt, MatchFormat Format, int CourtNumber,
    bool Won, int MyScore, int OpponentScore,
    IReadOnlyList<string> Partners, IReadOnlyList<string> Opponents);

/// <param name="Friendship">You and this player (None on your own profile).</param>
/// <param name="FriendRequests">Friend requests waiting for your answer (your own profile only).</param>
public sealed record ProfileDto(
    PlayerCardDto Player, int SkillEstimate, ProgressDto Progress, StatsDto Stats,
    IReadOnlyList<MatchHistoryItemDto> RecentMatches,
    IReadOnlyList<SessionSummaryDto> Sessions,
    ActiveMatchDto? ActiveMatch,
    FriendStatus Friendship = FriendStatus.None,
    int FriendRequests = 0);

// ---- Friends --------------------------------------------------------------------------------

/// <summary>Where you stand with another player: Outgoing = you asked them, Incoming = they asked you.</summary>
public enum FriendStatus
{
    None,
    Outgoing,
    Incoming,
    Friends,
}

/// <param name="Since">When you became friends, or when the request was sent.</param>
public sealed record FriendDto(PlayerCardDto Player, DateTimeOffset Since);

public sealed record FriendsDto(
    string MyCode, int MaxFriends,
    IReadOnlyList<FriendDto> Friends, IReadOnlyList<FriendDto> Incoming, IReadOnlyList<FriendDto> Outgoing);

public sealed record AddFriendRequest(string Code);

public sealed record FriendActionDto(PlayerCardDto Player, FriendStatus Status);

/// <summary>The signed-in player's current match, for the notification bell.</summary>
public sealed record ActiveMatchDto(
    Guid SessionId, string SessionTitle, Guid MatchId, int CourtNumber, MatchStatus Status, bool NeedsAction);

// ---- Cosmetics ------------------------------------------------------------------------------

public sealed record CosmeticItemDto(
    string Id, string Name, CosmeticSlot Slot, Rarity Rarity, int Price, int RequiredLevel, bool IsStarter,
    bool Owned, bool Equipped, bool Unlocked);

public sealed record CosmeticsDto(
    ProgressDto Progress, Loadout Loadout, IReadOnlyList<CosmeticItemDto> Items, RewardRules Rewards);
