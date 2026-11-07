import { currentToken, useAuth } from '../auth/authStore'
import { HttpClient } from './httpClient'
import type {
  Appearance,
  AuditEntry,
  Cosmetics,
  CosmeticSlot,
  CreateSessionInput,
  InvitePreview,
  Profile,
  SessionDetail,
  SessionSettings,
  SessionSummary,
  TokenResponse,
  Friends,
  FriendAction,
} from './types'

export const API_BASE = import.meta.env.VITE_API_URL ?? ''

const http = new HttpClient(API_BASE, currentToken, () => useAuth.getState().signOut())

export const authApi = {
  login: (email: string, password: string) => http.post<TokenResponse>('/api/auth/login', { email, password }),
  /** Play as guest from a session QR: just a name. */
  guest: (inviteCode: string, displayName: string, acceptTerms: boolean) =>
    http.post<TokenResponse>('/api/auth/guest', { inviteCode, displayName, acceptTerms }),
  /** Emails a reset link if the account exists (the answer is the same either way). */
  forgotPassword: (email: string) => http.post('/api/auth/forgot-password', { email }),
  resetPassword: (email: string, token: string, newPassword: string) => http.post('/api/auth/reset-password', { email, token, newPassword }),
  /** Step 1 of sign-up: makes the account and emails a 6-digit code (no sign-in yet). */
  register: (email: string, password: string, displayName: string, acceptTerms: boolean) =>
    http.post<{ verificationRequired: boolean }>('/api/auth/register', { email, password, displayName, acceptTerms }),
  /** Step 2: the code from the email; signs the player in. */
  verifyEmail: (email: string, code: string) => http.post<TokenResponse>('/api/auth/verify-email', { email, code }),
  resendVerification: (email: string) => http.post('/api/auth/resend-verification', { email }),
}

export const profileApi = {
  me: () => http.get<Profile>('/api/me'),
  player: (userId: string) => http.get<Profile>(`/api/players/${userId}`),
  update: (displayName: string, skillEstimate: number) => http.put('/api/me', { displayName, skillEstimate }),
  updateAppearance: (appearance: Appearance) => http.put('/api/me/appearance', appearance),
}

export const friendsApi = {
  mine: () => http.get<Friends>('/api/friends'),
  addByCode: (code: string) => http.post<FriendAction>('/api/friends/code', { code }),
  add: (userId: string) => http.post<FriendAction>(`/api/friends/${userId}`),
  accept: (userId: string) => http.post<FriendAction>(`/api/friends/${userId}/accept`),
  /** Decline, cancel, or unfriend. */
  remove: (userId: string) => http.delete(`/api/friends/${userId}`),
}

export const cosmeticsApi = {
  get: () => http.get<Cosmetics>('/api/cosmetics'),
  purchase: (itemId: string) => http.post(`/api/cosmetics/${encodeURIComponent(itemId)}/purchase`),
  equip: (itemId: string) => http.post(`/api/cosmetics/${encodeURIComponent(itemId)}/equip`),
  unequip: (slot: CosmeticSlot) => http.post(`/api/cosmetics/slots/${slot}/unequip`),
}

export const inviteApi = {
  preview: (code: string) => http.get<InvitePreview>(`/api/invites/${encodeURIComponent(code)}`),
  join: (code: string) => http.post<{ sessionId: string }>(`/api/invites/${encodeURIComponent(code)}/join`),
}

const s = (id: string) => `/api/sessions/${id}`

export const sessionApi = {
  mine: () => http.get<SessionSummary[]>('/api/sessions'),
  get: (id: string) => http.get<SessionDetail>(s(id)),
  create: (input: CreateSessionInput) => http.post<{ id: string }>('/api/sessions', input),
  update: (id: string, body: { title: string; location: string; scheduledAt: string; settings: SessionSettings }) =>
    http.put(s(id), body),
  start: (id: string) => http.post(`${s(id)}/start`),
  pause: (id: string) => http.post(`${s(id)}/pause`),
  close: (id: string, voidUnfinished: boolean) => http.post(`${s(id)}/close?voidUnfinished=${voidUnfinished}`),
  fill: (id: string) => http.post<{ created: number }>(`${s(id)}/fill`),
  setCourtAvailable: (id: string, court: number, available: boolean) =>
    http.put(`${s(id)}/courts/${court}/availability`, { available }),
  setSkill: (id: string, userId: string, skill: number) => http.put(`${s(id)}/players/${userId}/skill`, { skill }),
  /** Organizer: set a player's fixed partner (null unpairs them). */
  setPartner: (id: string, userId: string, partnerId: string | null) => http.put(`${s(id)}/players/${userId}/partner`, { partnerId }),
  setQueued: (id: string, userId: string, queued: boolean) => http.put(`${s(id)}/players/${userId}/queue`, { queued }),
  leave: (id: string) => http.post(`${s(id)}/leave`),
  audit: (id: string) => http.get<AuditEntry[]>(`${s(id)}/audit`),
  /** Organizer: save the hand-lined-up queue groups, in order. An empty list goes back to automatic. */
  setPlannedGroups: (id: string, groups: { teamA: string[]; teamB: string[] }[]) => http.put(`${s(id)}/up-next`, { groups }),
}

const m = (sessionId: string, matchId: string) => `${s(sessionId)}/matches/${matchId}`

export const matchApi = {
  createManual: (sessionId: string, courtNumber: number, teamA: string[], teamB: string[]) =>
    http.post<{ id: string }>(`${s(sessionId)}/matches`, { courtNumber, teamA, teamB }),
  accept: (sid: string, mid: string) => http.post(`${m(sid, mid)}/accept`),
  decline: (sid: string, mid: string) => http.post(`${m(sid, mid)}/decline`),
  start: (sid: string, mid: string) => http.post(`${m(sid, mid)}/start`),
  report: (sid: string, mid: string, teamAScore: number, teamBScore: number, notes?: string) =>
    http.post(`${m(sid, mid)}/result`, { teamAScore, teamBScore, notes }),
  verify: (sid: string, mid: string) => http.post(`${m(sid, mid)}/verify`),
  replace: (sid: string, mid: string, outgoingUserId: string, incomingUserId: string) =>
    http.post(`${m(sid, mid)}/replace`, { outgoingUserId, incomingUserId }),
  /** Organizer: set who plays on this court. Newcomers come from the waitlist or trade places with another court. */
  setLineup: (sid: string, mid: string, teamA: string[], teamB: string[]) => http.put(`${m(sid, mid)}/lineup`, { teamA, teamB }),
  move: (sid: string, mid: string, courtNumber: number) => http.post(`${m(sid, mid)}/move`, { courtNumber }),
  switchTeams: (sid: string, mid: string, firstUserId: string, secondUserId: string) =>
    http.post(`${m(sid, mid)}/switch-teams`, { firstUserId, secondUserId }),
  cancel: (sid: string, mid: string, reason?: string) => http.post(`${m(sid, mid)}/cancel`, { reason }),
  void: (sid: string, mid: string, reason?: string) => http.post(`${m(sid, mid)}/void`, { reason }),
}
