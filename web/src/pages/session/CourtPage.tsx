import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { CourtCard } from '../../components/court/CourtCard'
import { MatchActions } from '../../components/court/MatchActions'
import { UpNextCard } from '../../components/session/UpNext'
import { UpNextActions } from '../../components/session/UpNextActions'
import { SectionTitle, Spinner } from '../../components/ui/primitives'
import { useSession } from '../../hooks/queries'
import { friendlyFormat, useNow } from '../../lib/format'
import { PlayerGroup } from './QueueTab'
import { partnerNames } from '../../lib/queue'
import { useSessionHub } from '../../realtime/useSessionHub'
import { SessionBottomNav } from './SessionNav'
import { ErrorPage, PageError } from '../../components/ui/ErrorPage'

/** Full-screen VS view for one court. Same component as the grid, bigger stage. */
export function CourtPage() {
  const { sessionId, courtNumber } = useParams()
  const session = useSession(sessionId)
  const now = useNow(15_000)
  useSessionHub(sessionId)

  if (session.isLoading) return <Spinner />
  if (!session.data) return <PageError error={session.error} onRetry={() => session.refetch()} />

  const s = session.data
  const number = Number(courtNumber)
  const court = s.courts.find((c) => c.number === number)
  if (!court) return <ErrorPage kind="notFound" />

  const grouped = new Set(s.upNext.flatMap((g) => [...g.teamA, ...g.teamB].map((p) => p.userId)))
  const waiting = s.participants.filter((p) => p.status === 'Waiting' && !grouped.has(p.player.userId))
  const prev = s.courts.find((c) => c.number === number - 1)
  const next = s.courts.find((c) => c.number === number + 1)
  const base = `/sessions/${s.id}/courts`

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center gap-2">
        <Link to={`/sessions/${s.id}`} className="rounded-full p-2 text-white/70 hover:bg-white/8" aria-label="Back to all courts">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="font-display text-xl font-bold">{s.title}</div>
          <div className="text-sm text-muted">{friendlyFormat(s.format)}</div>
        </div>
        <CourtNav to={prev && `${base}/${prev.number}`} label="Previous court" icon={<ChevronLeft className="size-6" />} />
        <CourtNav to={next && `${base}/${next.number}`} label="Next court" icon={<ChevronRight className="size-6" />} />
      </div>

      <CourtCard
        court={court}
        format={s.format}
        size="full"
        waitingCount={s.participants.filter((p) => p.status === 'Waiting').length}
        actions={court.match && <MatchActions session={s} match={court.match} />}
      />

      {s.status !== 'Closed' && (
        <div className="mt-5 space-y-5">
          {s.upNext[0] ? (
            <section>
              <SectionTitle>Next in queue</SectionTitle>
              <UpNextCard group={s.upNext[0]} highlight actions={s.isOrganizer ? <UpNextActions session={s} group={s.upNext[0]} /> : undefined} />
              <p className="mt-1.5 text-xs text-muted">They take the next court that frees up.</p>
            </section>
          ) : (
            <p className="card p-4 text-center text-sm text-muted">Not enough players waiting for the next game yet.</p>
          )}
          {s.upNext.length > 1 && (
            <section>
              <SectionTitle>After that</SectionTitle>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {s.upNext.slice(1).map((g) => (
                  <UpNextCard key={g.order} group={g} compact actions={s.isOrganizer ? <UpNextActions session={s} group={g} /> : undefined} />
                ))}
              </div>
            </section>
          )}
          <PlayerGroup title={`Waitlist (${waiting.length})`} players={waiting} now={now} showPosition skillBased={s.settings.mode === 'SkillBased'} partners={partnerNames(s)} />
        </div>
      )}
      <SessionBottomNav sessionId={s.id} tab="courts" />
    </div>
  )
}

function CourtNav({ to, label, icon }: { to?: string; label: string; icon: React.ReactNode }) {
  if (!to) return <span className="size-11 rounded-full border border-white/5 opacity-30" aria-hidden />
  return (
    <Link to={to} aria-label={label} className="grid size-11 place-items-center rounded-full border border-white/15 bg-surface hover:border-lime/60">
      {icon}
    </Link>
  )
}
