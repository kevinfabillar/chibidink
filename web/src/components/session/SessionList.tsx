import clsx from 'clsx'
import { CalendarDays, ChevronDown, ChevronRight, Crown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { SessionSummary } from '../../api/types'
import { dateTimeText } from '../../lib/format'
import { EmptyState } from '../ui/EmptyState'

const statusStyle = {
  Active: 'border-lime/70 text-lime',
  Open: 'border-sky/70 text-sky',
  Closed: 'border-white/20 text-white/50',
}

const statusText = { Active: 'Live', Open: 'Open', Closed: 'Closed' }
const order = { Active: 0, Open: 1, Closed: 2 }

/** Compact list: one card with slim rows. Live and open sessions come first; only a few show until "See all". */
export function SessionList({ sessions, empty, initial = 3 }: { sessions: SessionSummary[]; empty: string; initial?: number }) {
  const [all, setAll] = useState(false)
  if (sessions.length === 0) return <EmptyState icon={<CalendarDays className="size-7" />} title="No sessions yet" text={empty} />

  const sorted = [...sessions].sort((a, b) => order[a.status] - order[b.status])
  const shown = all ? sorted : sorted.slice(0, initial)
  const hidden = sorted.length - shown.length

  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-white/8">
        {shown.map((s) => (
          <li key={s.id}>
            <Link to={`/sessions/${s.id}`} className={clsx('flex items-center gap-3 px-4 py-3 transition hover:bg-white/4', s.status === 'Closed' && 'opacity-65')}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-display text-base font-bold">{s.title}</span>
                  {s.isOrganizer && <Crown className="size-3.5 shrink-0 text-lime" aria-label="Organizer" />}
                </div>
                <div className="truncate text-xs text-muted">
                  {dateTimeText(s.scheduledAt)} · {s.playerCount} player{s.playerCount === 1 ? '' : 's'}
                </div>
              </div>
              <span className={clsx('pill shrink-0 px-2 py-0.5 text-[11px]', statusStyle[s.status])}>{statusText[s.status]}</span>
              <ChevronRight className="size-4 shrink-0 text-white/40" />
            </Link>
          </li>
        ))}
      </ul>
      {sorted.length > initial && (
        <button
          onClick={() => setAll((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-white/8 py-2.5 text-sm font-semibold text-lime hover:bg-white/4"
        >
          {all ? 'Show less' : `See all (${sorted.length})`}
          <ChevronDown className={clsx('size-4 transition', all && 'rotate-180')} />
        </button>
      )}
      {!all && hidden > 0 && <span className="sr-only">{hidden} more sessions hidden</span>}
    </div>
  )
}
