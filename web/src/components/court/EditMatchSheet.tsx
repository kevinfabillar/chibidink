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
  const waitlist = session.participants.filter((p) => p.status === 'Waiting')
  const checkedOut = session.participants.filter((p) => p.status === 'Paused')
  const freeCourts = session.courts.filter((c) => c.status === 'Available' && !c.match)

  const [outgoing, setOutgoing] = useState(inMatch[0]?.userId ?? '')
  const [incoming, setIncoming] = useState('')
  const [court, setCourt] = useState(freeCourts[0]?.number ?? 0)
  const [fromA, setFromA] = useState(match.teamA[0]?.player.userId ?? '')
  const [fromB, setFromB] = useState(match.teamB[0]?.player.userId ?? '')

  const replace = useSessionAction(session.id, () => matchApi.replace(session.id, match.id, outgoing, incoming))
  const move = useSessionAction(session.id, () => matchApi.move(session.id, match.id, court))
  const switchTeams = useSessionAction(session.id, () => matchApi.switchTeams(session.id, match.id, fromA, fromB))
  const cancel = useSessionAction(session.id, () => matchApi.cancel(session.id, match.id))
  const voidMatch = useSessionAction(session.id, () => matchApi.void(session.id, match.id))
  const error = replace.error ?? switchTeams.error ?? move.error ?? cancel.error ?? voidMatch.error
  const canChange = prePlay || match.status === 'Playing'
  const done = { onSuccess: onClose }

  return (
    <Sheet open={open} onClose={onClose} title={`Edit court ${match.courtNumber}`}>
      <div className="space-y-6">
        {/* Games go straight on court (Playing), so changes are allowed until a score is entered. */}
        {canChange && (
          <section>
            <SectionTitle>Switch players between teams</SectionTitle>
            <p className="mb-3 text-sm text-muted">Same four players, new teams: one from Team A and one from Team B trade places.</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={fromA} onChange={(e) => setFromA(e.target.value)} className={selectCls} aria-label="Team A player">
                {match.teamA.map((p) => (
                  <option key={p.player.userId} value={p.player.userId}>
                    A: {p.player.displayName}
                  </option>
                ))}
              </select>
              <select value={fromB} onChange={(e) => setFromB(e.target.value)} className={selectCls} aria-label="Team B player">
                {match.teamB.map((p) => (
                  <option key={p.player.userId} value={p.player.userId}>
                    B: {p.player.displayName}
                  </option>
                ))}
              </select>
            </div>
            <Button className="mt-3" variant="dark" block disabled={!fromA || !fromB} loading={switchTeams.isPending} onClick={() => switchTeams.mutate(undefined, done)}>
              Switch teams
            </Button>
          </section>
        )}

        {canChange && (
          <section>
            <SectionTitle>Swap with the waitlist</SectionTitle>
            <p className="mb-3 text-sm text-muted">Someone from the waitlist comes on court. The player taken off goes back to the waitlist and keeps their spot.</p>
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
                {waitlist.length > 0 && (
                  <optgroup label="Waitlist">
                    {waitlist.map((p) => (
                      <option key={p.player.userId} value={p.player.userId}>
                        In: {p.player.displayName}
                      </option>
                    ))}
                  </optgroup>
                )}
                {checkedOut.length > 0 && (
                  <optgroup label="Checked out">
                    {checkedOut.map((p) => (
                      <option key={p.player.userId} value={p.player.userId}>
                        In: {p.player.displayName} (checked out)
                      </option>
                    ))}
                  </optgroup>
                )}
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
