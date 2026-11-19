import clsx from 'clsx'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { SessionDetail } from '../../api/types'
import { tierName, tierOf } from '../../lib/skill'

/** userId -> level (1 Beginner, 2 Intermediate, 3 Advanced). Null outside Skill Based sessions: no badges. */
const LevelsContext = createContext<Map<string, number> | null>(null)

/** Gives everything inside a Skill Based session its players' levels, so names can show a level badge. */
export function SessionLevelsProvider({ session, children }: { session: SessionDetail; children: ReactNode }) {
  const levels = useMemo(
    () => (session.settings.mode === 'SkillBased' ? new Map(session.participants.map((p) => [p.player.userId, tierOf(p.skillEstimate)])) : null),
    [session.settings.mode, session.participants],
  )
  return <LevelsContext.Provider value={levels}>{children}</LevelsContext.Provider>
}

const styles: Record<number, string> = {
  1: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300 light:text-emerald-700',
  2: 'border-sky/50 bg-sky/10 text-sky',
  3: 'border-orange-400/50 bg-orange-400/10 text-orange-300 light:text-orange-700',
}

/**
 * A player's level as a colored badge: green Beginner, blue Intermediate, orange Advanced. Only in Skill Based
 * sessions. `short` shows just the first letter (B / I / A), for tight spots like court cards.
 */
export function LevelBadge({ userId, short }: { userId: string; short?: boolean }) {
  const level = useContext(LevelsContext)?.get(userId)
  if (level === undefined) return null
  const name = tierName(level)
  return (
    <span
      title={name}
      aria-label={name}
      className={clsx(
        'inline-flex shrink-0 items-center rounded-full border font-semibold leading-none',
        short ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        styles[level],
      )}
    >
      {short ? name[0] : name}
    </span>
  )
}
