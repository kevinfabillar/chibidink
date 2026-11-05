import { useState } from 'react'
import { matchApi } from '../../api/api'
import type { Match, SessionDetail } from '../../api/types'
import { useSessionAction } from '../../hooks/queries'
import { Button } from '../ui/Button'
import { ErrorNote, SectionTitle } from '../ui/primitives'
import { Sheet } from '../ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  session: SessionDetail
  match: Match
}

const selectCls =
  'h-11 w-full rounded-xl border border-white/10 bg-night px-3 text-white focus:border-lime/70 focus:outline-none'

/** Organizer overrides for one match. Every change is recorded in the audit log. */
export function EditMatchSheet({ open, onClose, session, match }: Props) {
  const prePlay = ['Proposed', 'AwaitingConfirmation', 'Ready'].includes(match.status)
  const started = ['Playing', 'PendingResult'].includes(match.status)
  const inMatch = [...match.teamA, ...match.teamB].map((p) => p.player)
  const available = session.participants.filter((p) => p.status === 'Waiting' || p.status === 'Paused')
  const freeCourts = session.courts.filter((c) => c.status === 'Available' && !c.match)

  const [outgoing, setOutgoing] = useState(inMatch[0]?.userId ?? '')
  const [incoming, setIncoming] = useState('')
  const [court, setCourt] = useState(freeCourts[0]?.number ?? 0)

  const replace = useSessionAction(session.id, () => matchApi.replace(session.id, match.id, outgoing, incoming))
  const move = useSessionAction(session.id, () => matchApi.move(session.id, match.id, court))
  const cancel = useSessionAction(session.id, () => matchApi.cancel(session.id, match.id))
  const voidMatch = useSessionAction(session.id, () => matchApi.void(session.id, match.id))
  const error = replace.error ?? move.error ?? cancel.error ?? voidMatch.error
  const done = { onSuccess: onClose }

  return (
    <Sheet open={open} onClose={onClose} title={`Edit court ${match.courtNumber}`}>
      <div className="space-y-6">
        {prePlay && (
          <section>
            <SectionTitle>Swap a player</SectionTitle>
            <p className="mb-3 text-sm text-muted">The replaced player goes back to the queue and keeps their spot.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <select value={outgoing} onChange={(e) => setOutgoing(e.target.value)} className={selectCls} aria-label="Player to replace">
                {inMatch.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    Out: {p.displayName}
                  </option>
                ))}
              </select>
              <select value={incoming} onChange={(e) => setIncoming(e.target.value)} className={selectCls} aria-label="Replacement player">
                <option value="">In: choose player</option>
                {available.map((p) => (
                  <option key={p.player.userId} value={p.player.userId}>
                    In: {p.player.displayName} {p.status === 'Paused' ? '(checked out)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <Button className="mt-3" variant="dark" block disabled={!incoming} loading={replace.isPending} onClick={() => replace.mutate(undefined, done)}>
              Swap player
            </Button>
          </section>
        )}

        {(prePlay || match.status === 'Playing') && freeCourts.length > 0 && (
          <section>
            <SectionTitle>Move to another court</SectionTitle>
            <div className="flex gap-2">
              <select value={court} onChange={(e) => setCourt(Number(e.target.value))} className={selectCls} aria-label="Target court">
                {freeCourts.map((c) => (
                  <option key={c.number} value={c.number}>
                    Court {c.number}
                  </option>
                ))}
              </select>
              <Button variant="dark" loading={move.isPending} onClick={() => move.mutate(undefined, done)}>
                Move
              </Button>
            </div>
          </section>
        )}

        <section className="space-y-2">
          {prePlay && (
            <Button variant="danger" block loading={cancel.isPending} onClick={() => cancel.mutate(undefined, done)}>
              Cancel match (players keep queue spots)
            </Button>
          )}
          {started && (
            <Button variant="danger" block loading={voidMatch.isPending} onClick={() => voidMatch.mutate(undefined, done)}>
              Void match (no result recorded)
            </Button>
          )}
        </section>
        <ErrorNote error={error} />
      </div>
    </Sheet>
  )
}
