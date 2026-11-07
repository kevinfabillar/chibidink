import type { SessionDetail } from '../api/types'

/** userId -> their fixed partner's name, for badges. */
export function partnerNames(session: SessionDetail): Map<string, string> {
  const name = new Map(session.participants.map((p) => [p.player.userId, p.player.displayName]))
  const result = new Map<string, string>()
  for (const p of session.participants) if (p.partnerId && name.has(p.partnerId)) result.set(p.player.userId, name.get(p.partnerId)!)
  return result
}

/** How the queue picks the next four, in a line. */
export const modeText = {
  FairMatch: 'Fair Match: everyone plays equally. Fewest games go first, then whoever has waited longest. Partners rotate.',
  SkillBased: 'Skill Based: you play with others at your level (Beginner, Novice or Intermediate). Fewest games go first within each level.',
} as const
