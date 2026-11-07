import type { Participant, RewardRules } from '../api/types'

/**
 * XP and coins a player earned in one session. Every verified game pays the same base reward plus a
 * win bonus (see RewardRules), so it follows from their games and wins here.
 */
export function sessionEarnings(me: Pick<Participant, 'completedGames' | 'wins'> | null | undefined, rules: RewardRules | undefined) {
  if (!me || !rules) return null
  return {
    xp: me.completedGames * rules.matchExperience + me.wins * rules.winExperience,
    coins: me.completedGames * rules.matchCoins + me.wins * rules.winCoins,
  }
}
