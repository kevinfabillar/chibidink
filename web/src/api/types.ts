// Mirrors the server contracts in ChibiDink.Application/Contracts.

export type MatchFormat = 'Singles' | 'Doubles'
export type SessionStatus = 'Open' | 'Active' | 'Closed'
export type SessionRole = 'Player' | 'Organizer'
export type ParticipantStatus = 'Paused' | 'Waiting' | 'InMatch' | 'Left'
export type CourtStatus = 'Available' | 'Unavailable'
export type MatchStatus =
  | 'Proposed'
  | 'AwaitingConfirmation'
  | 'Ready'
  | 'Playing'
  | 'PendingResult'
  | 'Completed'
  | 'Cancelled'
  | 'Voided'
export type Team = 'A' | 'B'
export type ConfirmationStatus = 'Pending' | 'Accepted' | 'Declined'
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'
export type CosmeticSlot = 'Outfit' | 'Paddle' | 'PaddleEffect' | 'CharacterAura' | 'Background' | 'Nameplate'

/** The paddle character's body, face and handle. Gear (outfits), glows and auras come from the loadout. */
export interface Appearance {
  bodyColor: string
  edgeColor: string
  /** sparkle | round | happy | sleepy | star | dot */
  eyeStyle: string
  eyeColor: string
  /** determined | soft | raised | worried | none */
  browStyle: string
  /** smirk | grin | wow | cat | blep | flat */
  mouthStyle: string
  /** blush | freckles | none */
  cheekStyle: string
  /** scar | bandage | star | none */
  faceMark: string
  gripColor: string
  /** diagonal | stripes | cross | plain */
  gripWrap: string
  /** slim | classic | chunky */
  handleShape: string
  /** round | pommel | ball */
  endCap: string
  endCapColor: string
  /** Empty = the outfit's own shoes. */
  shoeColor: string
}

export interface Loadout {
  outfitId: string
  paddleId: string
  effectId: string | null
  auraId: string | null
  /** Premium name skin. */
  nameplateId?: string | null
  /** null = the starter locker room */
  backgroundId?: string | null
}

export interface PlayerCard {
  userId: string
  displayName: string
  characterLevel: number
  appearance: Appearance
  loadout: Loadout
}

export interface Stats {
  matches: number
  wins: number
  losses: number
  winRate: number | null
  singlesWins: number
  singlesLosses: number
  doublesWins: number
  doublesLosses: number
}

export interface Progress {
  level: number
  experience: number
  levelStartXp: number
  nextLevelXp: number
  coins: number
}

/** Fair Match = equal play; Skill Based = grouped by Beginner / Novice / Intermediate. */
export type QueueMode = 'FairMatch' | 'SkillBased'

export interface SessionSettings {
  mode: QueueMode
  skillTolerance: number
  confirmationWindowSeconds: number
  waitProtectionMinutes: number
  pointsToWin: number
  winBy: number
  autoMatchmaking: boolean
  openAdmission: boolean
}

export interface SessionSummary {
  id: string
  title: string
  location: string
  scheduledAt: string
  format: MatchFormat
  status: SessionStatus
  courtCount: number
  playerCount: number
  isOrganizer: boolean
  myStatus: ParticipantStatus | null
}

export interface InvitePreview {
  id: string
  title: string
  location: string
  scheduledAt: string
  format: MatchFormat
  status: SessionStatus
  courtCount: number
  playerCount: number
  organizerName: string
}

export interface MatchPlayer {
  player: PlayerCard
  confirmation: ConfirmationStatus
}

export interface MatchResult {
  teamAScore: number
  teamBScore: number
  winner: Team
  reportedById: string
  verified: boolean
  notes: string | null
}

export interface Match {
  id: string
  courtNumber: number
  format: MatchFormat
  status: MatchStatus
  isManual: boolean
  isMixedSkill: boolean
  createdAt: string
  confirmationDeadline: string | null
  startedAt: string | null
  endedAt: string | null
  teamA: MatchPlayer[]
  teamB: MatchPlayer[]
  result: MatchResult | null
  myTeam: Team | null
  canVerify: boolean
  cancelReason: string | null
}

export interface Court {
  number: number
  status: CourtStatus
  match: Match | null
}

export interface Participant {
  player: PlayerCard
  role: SessionRole
  status: ParticipantStatus
  skillEstimate: number
  waitingSince: string | null
  queuePosition: number | null
  completedGames: number
  wins: number
  losses: number
  winRate: number | null
  /** Fixed doubles partner for this session, set by the organizer. */
  partnerId: string | null
}

export interface MatchHistoryItem {
  matchId: string
  sessionId: string
  playedAt: string
  format: MatchFormat
  courtNumber: number
  won: boolean
  myScore: number
  opponentScore: number
  partners: string[]
  opponents: string[]
}

export interface SessionDetail {
  id: string
  title: string
  location: string
  scheduledAt: string
  format: MatchFormat
  status: SessionStatus
  inviteCode: string
  settings: SessionSettings
  isOrganizer: boolean
  me: Participant | null
  myMatch: Match | null
  courts: Court[]
  participants: Participant[]
  myGames: MatchHistoryItem[]
  /** The next groups of four, in the order they go on court. */
  upNext: UpNextGroup[]
}

export interface UpNextGroup {
  order: number
  teamA: PlayerCard[]
  teamB: PlayerCard[]
  /** Skill-based sessions: the tier this group plays at. */
  tier: string | null
  isMixedSkill: boolean
  /** Lined up by the organizer (kept as edited) instead of picked by the matchmaker. */
  isPlanned: boolean
  /** Everyone in the group is off court, so it can start now. */
  isReady: boolean
  /** The same four as last game: held until another court finishes, so the groups can mix. */
  waitingToMix?: boolean
}

export interface AuditEntry {
  matchId: string | null
  actorName: string
  action: string
  details: string
  at: string
}

export interface ActiveMatch {
  sessionId: string
  sessionTitle: string
  matchId: string
  courtNumber: number
  status: MatchStatus
  needsAction: boolean
}

export interface Profile {
  player: PlayerCard
  skillEstimate: number
  progress: Progress
  stats: Stats
  recentMatches: MatchHistoryItem[]
  sessions: SessionSummary[]
  activeMatch: ActiveMatch | null
  /** You and this player (None on your own profile). */
  friendship: FriendStatus
  /** Friend requests waiting for your answer (your own profile only). */
  friendRequests: number
  /** Street Cred per kind of kudos, highest first. */
  streetCred?: StreetCred[]
  /** Your latest finished game you haven't given kudos for (own profile only). */
  kudosPrompt?: KudosPrompt | null
}

export type KudosKind =
  | 'Dinks' | 'Drops' | 'Volleys' | 'Serves' | 'Smashes' | 'Defense' | 'Drives' | 'Slices' | 'Resets'
  | 'GoodSport' | 'GreatPartner' | 'FunToPlayWith'

/** Kudos received × different people who gave them. */
export interface StreetCred {
  kind: KudosKind
  received: number
  givers: number
  cred: number
}

/** Your own kudos page. Anonymous: who gave each kudos is never included. */
export interface MyKudos {
  total: number
  byKind: StreetCred[]
  recent: { kind: KudosKind; sessionTitle: string; givenAt: string }[]
}

export interface StreetCredEntry {
  rank: number
  player: PlayerCard
  cred: number
  received: number
  givers: number
}

export interface KudosPrompt {
  sessionId: string
  sessionTitle: string
  matchId: string
  courtNumber: number
}

export interface KudosCount {
  kind: KudosKind
  count: number
}

/** Someone you played with this session (kudos open), from your latest game together. */
export interface KudosTarget {
  player: PlayerCard
  matchId: string
  courtNumber: number
  playedAt: string
  teammate: boolean
  /** The one kudos you gave them this session, if any. */
  given: KudosKind | null
  /** You confirmed it: final. */
  locked?: boolean
  /** You confirmed without giving this player one: closed. */
  closed?: boolean
}

export interface SessionKudos {
  /** People you played with (newest game first) and what you gave each. */
  players: KudosTarget[]
  received: KudosCount[]
  /** Everyone's kudos in this session by kind: who received them (never who gave them). */
  board?: { kind: KudosKind; players: { player: PlayerCard; count: number }[] }[]
}

/** Outgoing = you asked them; Incoming = they asked you. */
export type FriendStatus = 'None' | 'Outgoing' | 'Incoming' | 'Friends'

export interface Friend {
  player: PlayerCard
  /** When you became friends, or when the request was sent. */
  since: string
}

export interface Friends {
  myCode: string
  maxFriends: number
  friends: Friend[]
  incoming: Friend[]
  outgoing: Friend[]
}

export interface FriendAction {
  player: PlayerCard
  status: FriendStatus
}

export interface CosmeticItem {
  id: string
  name: string
  slot: CosmeticSlot
  rarity: Rarity
  price: number
  requiredLevel: number
  isStarter: boolean
  owned: boolean
  equipped: boolean
  unlocked: boolean
  /** Earned items: the kudos that unlock it and how many you have so far. */
  achievement?: { kind: KudosKind; required: number; progress: number } | null
}

export interface RewardRules {
  matchExperience: number
  winExperience: number
  matchCoins: number
  winCoins: number
  welcomeCoins: number
}

export interface Cosmetics {
  progress: Progress
  loadout: Loadout
  items: CosmeticItem[]
  rewards: RewardRules
}

export interface TokenResponse {
  tokenType: string
  accessToken: string
  expiresIn: number
  refreshToken: string
}

export interface CreateSessionInput {
  title: string
  location: string
  scheduledAt: string
  format: MatchFormat
  courtCount: number
  settings?: SessionSettings
}
