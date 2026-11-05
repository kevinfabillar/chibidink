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
export type CosmeticSlot = 'Outfit' | 'Paddle' | 'PaddleEffect' | 'CharacterAura' | 'Background'

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
}

export interface Loadout {
  outfitId: string
  paddleId: string
  effectId: string | null
  auraId: string | null
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
