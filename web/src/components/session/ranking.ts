import type { Participant } from '../../api/types'

/** Session ranking: most wins, then best win rate, then most games played. Players with no games are left out. */
export function rankPlayers(players: Participant[]) {
  return [...players]
    .filter((p) => p.completedGames > 0)
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        (b.winRate ?? 0) - (a.winRate ?? 0) ||
        b.completedGames - a.completedGames ||
        a.player.displayName.localeCompare(b.player.displayName),
    )
}
