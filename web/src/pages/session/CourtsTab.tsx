import { useNavigate } from 'react-router'
import type { SessionDetail } from '../../api/types'
import { CourtCard } from '../../components/court/CourtCard'
import { MatchActions } from '../../components/court/MatchActions'
import { QueueTab } from './QueueTab'
import { Hourglass, Play } from 'lucide-react'
import { sessionApi } from '../../api/api'
import { Button } from '../../components/ui/Button'
import { ErrorNote } from '../../components/ui/primitives'
import { useSessionAction } from '../../hooks/queries'

/** Courts and queue on one page: the court VS dashboard on top, the line (up next, waiting) below. */
export function CourtsTab({ session }: { session: SessionDetail }) {
  const navigate = useNavigate()
  const waiting = session.participants.filter((p) => p.status === 'Waiting').length

  return (
    <div className="space-y-8">
      {session.status === 'Open' && <StartBanner session={session} />}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {session.courts.map((court) => {
          const match = court.match
          const canAct = match && (match.myTeam !== null || session.isOrganizer)
          return (
            <CourtCard
              key={court.number}
              court={court}
              format={session.format}
              waitingCount={waiting}
              onOpen={() => navigate(`/sessions/${session.id}/courts/${court.number}`)}
              actions={canAct ? <MatchActions session={session} match={match} /> : undefined}
            />
          )
        })}
      </div>

      <section aria-label="Queue">
        <h2 className="mb-3 font-display text-2xl font-extrabold">Queue</h2>
        <QueueTab session={session} />
      </section>
    </div>
  )
}

/**
 * Before the session starts: players can join and check in, but no games are made. The organizer gets a big
 * Start button; players see that they're waiting for it.
 */
function StartBanner({ session }: { session: SessionDetail }) {
  const start = useSessionAction(session.id, () => sessionApi.start(session.id))
  const checkedIn = session.participants.filter((p) => p.status === 'Waiting').length
  const groups = Math.floor(checkedIn / 4)

  if (!session.isOrganizer)
    return (
      <section className="card flex items-center gap-3 border-sky/50 bg-sky/10 p-4" role="status">
        <Hourglass className="size-7 shrink-0 text-sky" />
        <div>
          <div className="font-display text-lg font-bold">Waiting for the organizer to start</div>
          <p className="text-sm text-white/80">
            {session.me?.status === 'Waiting' ? "You're checked in. " : ''}Games begin as soon as the session starts. Stay close to the courts!
          </p>
        </div>
      </section>
    )

  return (
    <section className="card flex flex-col gap-4 border-lime/50 bg-lime/8 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-display text-xl font-bold">Not started yet</div>
        <p className="text-sm text-white/80">
          {checkedIn} player{checkedIn === 1 ? '' : 's'} checked in
          {checkedIn >= 4 ? ` · enough for ${groups} game${groups === 1 ? '' : 's'}` : ` · ${4 - checkedIn} more needed for the first game`}. Players can keep checking
          in with the QR or code. When you start, the first groups go straight on court.
        </p>
        <ErrorNote error={start.error} />
      </div>
      <Button size="lg" icon={<Play className="size-5" />} loading={start.isPending} onClick={() => start.mutate()} className="shrink-0">
        Start session
      </Button>
    </section>
  )
}
