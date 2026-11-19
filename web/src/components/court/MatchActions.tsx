import { Check, Pencil, Play, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { matchApi } from '../../api/api'
import type { Match, MatchResult, SessionDetail } from '../../api/types'
import { useSessionAction } from '../../hooks/queries'
import { durationText, useNow } from '../../lib/format'
import { allowedActions } from '../../lib/matchActions'
import { Button } from '../ui/Button'
import { ErrorNote } from '../ui/primitives'
import { EditMatchSheet } from './EditMatchSheet'
import { ReportWinnerSheet } from './ReportWinnerSheet'

interface Props {
  session: SessionDetail
  match: Match
}

/**
 * The buttons under a court, chosen by who is looking. Keyed by match, so when a court gets its next
 * game the buttons and sheets start fresh instead of carrying over from the last one.
 */
export function MatchActions(props: Props) {
  return <MatchActionsFor key={props.match.id} {...props} />
}

function MatchActionsFor({ session, match }: Props) {
  const viewer = { userId: session.me?.player.userId ?? '', isOrganizer: session.isOrganizer }
  const can = allowedActions(match, viewer)
  const [sheet, setSheet] = useState<'report' | 'edit' | null>(null)

  const accept = useSessionAction(session.id, () => matchApi.accept(session.id, match.id))
  const decline = useSessionAction(session.id, () => matchApi.decline(session.id, match.id))
  const start = useSessionAction(session.id, () => matchApi.start(session.id, match.id))
  const verify = useSessionAction(session.id, () => matchApi.verify(session.id, match.id))
  const report = useSessionAction(session.id, (winner: 'A' | 'B') => matchApi.reportWinner(session.id, match.id, winner))
  const error = accept.error ?? decline.error ?? start.error ?? verify.error ?? report.error

  if (!Object.values(can).some(Boolean)) return <MatchMeta match={match} />

  return (
    <div className="space-y-3">
      <MatchMeta match={match} />
      <div className="flex flex-wrap justify-center gap-2.5">
        {can.confirm && (
          <>
            <Button icon={<Check className="size-5" />} loading={accept.isPending} onClick={() => accept.mutate()} pill className="min-w-32 flex-1">
              Accept
            </Button>
            <Button variant="dark" icon={<X className="size-5" />} loading={decline.isPending} onClick={() => decline.mutate()} pill className="min-w-32 flex-1">
              Decline
            </Button>
          </>
        )}
        {can.start && (
          <Button
            size={match.status === 'Ready' ? 'lg' : 'md'}
            icon={<Play className="size-5 fill-current" />}
            loading={start.isPending}
            onClick={() => start.mutate()}
            pill
            className="min-w-40 flex-1 basis-full"
          >
            {match.status === 'AwaitingConfirmation' ? 'Start now' : 'Start match'}
          </Button>
        )}
        {can.report && (
          <Button variant="grape" icon={<Trophy className="size-5" />} loading={report.isPending} onClick={() => setSheet('report')} pill className="flex-1">
            {report.isPending ? 'Saving…' : 'Who won?'}
          </Button>
        )}
        {can.verify && (
          <Button icon={<Check className="size-5" />} loading={verify.isPending} onClick={() => verify.mutate()} pill className="flex-1">
            Confirm {match.result && resultText(match.result)}
          </Button>
        )}
        {can.edit && (
          <Button variant="dark" size="md" icon={<Pencil className="size-4.5" />} onClick={() => setSheet('edit')} pill>
            Edit match
          </Button>
        )}
      </div>
      <ErrorNote error={error} />

      <ReportWinnerSheet open={sheet === 'report'} onClose={() => setSheet(null)} match={match} onWinner={(team) => report.mutate(team)} />
      <EditMatchSheet open={sheet === 'edit'} onClose={() => setSheet(null)} session={session} match={match} />
    </div>
  )
}

/** "Team A won" for a Won-button result, or the score for older ones. */
const resultText = (r: MatchResult) => (r.winnerOnly ? `Team ${r.winner} won` : `${r.teamAScore}–${r.teamBScore}`)

/** Countdown while confirming, game clock while playing. */
function MatchMeta({ match }: { match: Match }) {
  const now = useNow()
  if (match.status === 'AwaitingConfirmation' && match.confirmationDeadline) {
    const left = new Date(match.confirmationDeadline).getTime() - now
    const accepted = [...match.teamA, ...match.teamB].filter((p) => p.confirmation === 'Accepted').length
    const total = match.teamA.length + match.teamB.length
    return (
      <p className="text-center text-sm text-sky">
        {accepted}/{total} confirmed · {left > 0 ? `${durationText(left)} to respond` : 'time is up'}
      </p>
    )
  }
  if (match.status === 'Ready')
    return <p className="text-center text-sm text-lime">On court and ready. Tap Start match when they begin.</p>
  if (match.status === 'Playing' && match.startedAt)
    return <p className="text-center text-sm text-lime">Game time {durationText(now - new Date(match.startedAt).getTime())}</p>
  if (match.status === 'PendingResult' && match.result)
    return (
      <p className="text-center text-sm text-[#d6a8ff]">
        Reported {resultText(match.result)}, waiting for the other team or organizer
      </p>
    )
  return null
}
