import clsx from 'clsx'
import type { PlayerCard, UpNextGroup } from '../../api/types'
import { PlayerAvatar } from '../character/Stage'

/** One predicted group of four: who goes on court next, split into the two teams. */
export function UpNextCard({ group, highlight, compact }: { group: UpNextGroup; highlight?: boolean; compact?: boolean }) {
  return (
    <div className={clsx('card p-3', highlight && 'border-lime/60 shadow-[0_0_24px_-10px_rgb(183_243_59/0.9)]')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={clsx('font-display text-sm font-extrabold tracking-wide', highlight ? 'text-lime' : 'text-white/70')}>
          {highlight ? 'NEXT ON COURT' : `GROUP ${group.order}`}
        </span>
        {group.tier && <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/80">{group.tier}</span>}
        {group.isMixedSkill && <span className="rounded-full border border-amber-300/40 px-2 py-0.5 text-[11px] font-semibold text-amber-200">Mixed levels</span>}
      </div>
      <div className="flex items-center gap-2">
        <Team players={group.teamA} compact={compact} />
        <span className="font-display text-sm font-extrabold text-white/50">VS</span>
        <Team players={group.teamB} compact={compact} />
      </div>
    </div>
  )
}

function Team({ players, compact }: { players: PlayerCard[]; compact?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl bg-night/70 p-2">
      {players.map((p) => (
        <div key={p.userId} className="flex min-w-0 items-center gap-2">
          <PlayerAvatar player={p} size={compact ? 28 : 34} />
          <span className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere] leading-tight">{p.displayName}</span>
        </div>
      ))}
    </div>
  )
}
