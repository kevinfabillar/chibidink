import clsx from 'clsx'
import { ChevronRight, Crown, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import type { SessionSummary } from '../../api/types'
import { dateTimeText } from '../../lib/format'
import { CalendarDays } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'

const statusStyle = {
  Active: 'border-lime/70 text-lime',
  Open: 'border-sky/70 text-sky',
  Closed: 'border-white/20 text-white/50',
}

const statusText = { Active: 'Live', Open: 'Open', Closed: 'Closed' }

export function SessionList({ sessions, empty }: { sessions: SessionSummary[]; empty: string }) {
  if (sessions.length === 0) return <EmptyState icon={<CalendarDays className="size-7" />} title="No sessions yet" text={empty} />
  return (
    <ul className="space-y-2.5">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link
            to={`/sessions/${s.id}`}
            className={clsx('card flex items-center gap-3 p-4 transition hover:border-lime/40', s.status === 'Closed' && 'opacity-70')}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-lg font-bold">{s.title}</span>
                {s.isOrganizer && <Crown className="size-4 shrink-0 text-lime" aria-label="Organizer" />}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {s.location}
                </span>
                <span>{dateTimeText(s.scheduledAt)}</span>
                <span>
                  {s.courtCount} courts · {s.playerCount} players
                </span>
              </div>
            </div>
            <span className={clsx('pill shrink-0 text-xs', statusStyle[s.status])}>{statusText[s.status]}</span>
            <ChevronRight className="size-5 shrink-0 text-white/40" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
