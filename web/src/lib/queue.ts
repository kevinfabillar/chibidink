/** How the queue picks the next four, in a line. */
export const modeText = {
  FairMatch: 'Fair Match: everyone plays equally. Fewest games go first, then whoever has waited longest. Partners rotate.',
  SkillBased: 'Skill Based: you play with others at your level (Beginner, Novice or Intermediate). Fewest games go first within each level.',
} as const
