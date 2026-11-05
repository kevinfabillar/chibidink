import clsx from 'clsx'
import type { MatchHistoryItem } from '../../api/types'
import { teamNames } from '../../lib/format'
import { Swords } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'

/** Verified results from one player's point of view. */
export function MatchHistoryList({ items, empty }: { items: MatchHistoryItem[]; empty: string }) {
  if (items.length === 0) return <EmptyState icon={<Swords className="size-7" />} title="No games yet" text={empty} />
  return (
    <ul className="space-y-2">
      {items.map((m) => (
        <li key={m.matchId} className="card flex items-center gap-3 p-3">
          <span
            className={clsx(
              'grid size-10 shrink-0 place-items-center rounded-xl font-display text-lg font-extrabold',
              m.won ? 'bg-lime text-ink' : 'bg-white/10 text-white/70',
            )}
          >
            {m.won ? 'W' : 'L'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">
              {m.partners.length > 0 && <>with {teamNames(m.partners)} · </>}vs {teamNames(m.opponents)}
            </div>
            <div className="text-xs text-muted">
              {new Date(m.playedAt).toLocaleDateString()} · Court {m.courtNumber} · {m.format}
            </div>
          </div>
          <span className="font-display text-xl font-bold">
            {m.myScore}–{m.opponentScore}
          </span>
        </li>
      ))}
    </ul>
  )
}
