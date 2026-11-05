// Pickleball skill tiers used by skill-based queues (and to balance teams). Older 1–5 estimates
// above 3 count as Intermediate.

export const SKILL_TIERS = [
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Novice' },
  { value: 3, label: 'Intermediate' },
] as const

export const tierOf = (skill: number) => Math.min(3, Math.max(1, Math.round(skill)))
export const tierName = (skill: number) => SKILL_TIERS[tierOf(skill) - 1].label
