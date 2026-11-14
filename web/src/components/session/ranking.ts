import type { Participant } from '../../api/types'

/**
 * Session standings, worked out by the server: most wins, then best win rate, then tiebreakers (won with tougher
 * partners, beat stronger opponents, point difference). Players level on everything share a place.
 * Players with no games are left out.
 */
export function rankPlayers(players: Participant[]) {
  return [...players]
    .filter((p) => p.completedGames > 0)
    .sort(
      (a, b) =>
        (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
        a.player.displayName.localeCompare(b.player.displayName),
    )
}

/** The place as shown: "3", or "T-3" when it's shared. */
export const placeLabel = (p: Participant, index: number) => `${p.rankTied ? 'T-' : ''}${p.rank ?? index + 1}`
