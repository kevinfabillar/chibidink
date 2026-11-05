import type { Match } from '../api/types'

export interface Viewer {
  userId: string
  isOrganizer: boolean
}

export interface AllowedActions {
  confirm: boolean
  start: boolean
  report: boolean
  verify: boolean
  edit: boolean
}

/** Which match buttons a viewer may see. Mirrors the server's rules; the server still enforces them. */
export function allowedActions(match: Match, viewer: Viewer): AllowedActions {
  const playing = match.myTeam !== null
  const involved = playing || viewer.isOrganizer
  const mine = [...match.teamA, ...match.teamB].find((p) => p.player.userId === viewer.userId)
  const terminal = ['Completed', 'Cancelled', 'Voided'].includes(match.status)

  return {
    confirm: match.status === 'AwaitingConfirmation' && mine?.confirmation === 'Pending',
    start: (match.status === 'Ready' && involved) || (match.status === 'AwaitingConfirmation' && viewer.isOrganizer),
    // Continuous play: only the organizer enters scores, and that ends the game.
    report: viewer.isOrganizer && (match.status === 'Playing' || match.status === 'PendingResult'),
    verify: false,
    edit: viewer.isOrganizer && !terminal,
  }
}
