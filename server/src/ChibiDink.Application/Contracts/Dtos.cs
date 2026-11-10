using ChibiDink.Domain.Social;
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
/// <param name="WaitingToMix">The same four as last game: held until another court finishes, so the groups mix.</param>
public sealed record UpNextDto(
    int Order, IReadOnlyList<PlayerCardDto> TeamA, IReadOnlyList<PlayerCardDto> TeamB, string? Tier, bool IsMixedSkill,
    bool IsPlanned, bool IsReady, bool WaitingToMix = false);

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
    int FriendRequests = 0,
    IReadOnlyList<StreetCredDto>? StreetCred = null,
    KudosPromptDto? KudosPrompt = null);

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

// ---- Kudos ----------------------------------------------------------------------------------

public sealed record KudosCountDto(KudosKind Kind, int Count);

/// <summary>Someone you played with this session (kudos open), from your latest game together.</summary>
/// <param name="Given">The one kudos you gave them this session, if any.</param>
/// <param name="Locked">You confirmed it: final.</param>
/// <param name="Closed">You confirmed your kudos without giving this player one: that's final too.</param>
public sealed record KudosTargetDto(PlayerCardDto Player, Guid MatchId, int CourtNumber, DateTimeOffset PlayedAt, bool Teammate, KudosKind? Given, bool Locked = false, bool Closed = false);

/// <summary>Street Cred for one kind: kudos received × different people who gave them.</summary>
public sealed record StreetCredDto(KudosKind Kind, int Received, int Givers, int Cred);

public sealed record StreetCredEntryDto(int Rank, PlayerCardDto Player, int Cred, int Received, int Givers);

/// <summary>Your latest finished match you haven't given any kudos for yet (bell and home banner).</summary>
public sealed record KudosPromptDto(Guid SessionId, string SessionTitle, Guid MatchId, int CourtNumber);

/// <param name="Players">People you played with (kudos still open) and what you gave each.</param>
/// <param name="Received">Kudos you got in this session.</param>
/// <param name="Board">Everyone's kudos in this session by kind: who received them (never who gave them).</param>
public sealed record SessionKudosDto(IReadOnlyList<KudosTargetDto> Players, IReadOnlyList<KudosCountDto> Received, IReadOnlyList<KudosBoardGroupDto>? Board = null);

/// <summary>One kind on the session's kudos board, with the players who received it (most first).</summary>
public sealed record KudosBoardGroupDto(KudosKind Kind, IReadOnlyList<KudosReceiverDto> Players);

public sealed record KudosReceiverDto(PlayerCardDto Player, int Count);

public sealed record GiveKudosRequest(Guid ToUserId, KudosKind Kind);

/// <summary>One kudos you received. Anonymous: who gave it is never shown.</summary>
public sealed record ReceivedKudosDto(KudosKind Kind, string SessionTitle, DateTimeOffset GivenAt);

/// <summary>Your own kudos page: totals per kind (with Street Cred) and the latest ones, anonymously.</summary>
public sealed record MyKudosDto(int Total, IReadOnlyList<StreetCredDto> ByKind, IReadOnlyList<ReceivedKudosDto> Recent);

public sealed record FriendActionDto(PlayerCardDto Player, FriendStatus Status);

/// <summary>The signed-in player's current match, for the notification bell.</summary>
public sealed record ActiveMatchDto(
    Guid SessionId, string SessionTitle, Guid MatchId, int CourtNumber, MatchStatus Status, bool NeedsAction);

// ---- Cosmetics ------------------------------------------------------------------------------

/// <param name="Achievement">Earned items: which kudos unlock it, and how many you have so far.</param>
public sealed record CosmeticItemDto(
    string Id, string Name, CosmeticSlot Slot, Rarity Rarity, int Price, int RequiredLevel, bool IsStarter,
    bool Owned, bool Equipped, bool Unlocked, AchievementDto? Achievement = null);

public sealed record AchievementDto(KudosKind Kind, int Required, int Progress);

public sealed record CosmeticsDto(
    ProgressDto Progress, Loadout Loadout, IReadOnlyList<CosmeticItemDto> Items, RewardRules Rewards);
