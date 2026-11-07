import { useState } from 'react'
import { matchApi } from '../../api/api'
import type { Match, PlayerCard, SessionDetail } from '../../api/types'
import { useSessionAction } from '../../hooks/queries'
import { Button } from '../ui/Button'
import { ErrorNote, SectionTitle } from '../ui/primitives'
import { Sheet } from '../ui/Sheet'
import { LineupEditor, type PickSource } from './LineupEditor'

interface Props {
  open: boolean
  onClose: () => void
  session: SessionDetail
  match: Match
}

const selectCls =
  'h-11 w-full min-w-0 rounded-xl border border-white/10 bg-night px-3 text-base text-white focus:border-lime/70 focus:outline-none'

const EDITABLE = ['Proposed', 'AwaitingConfirmation', 'Ready', 'Playing']

/** Organizer overrides for one match. Every change is recorded in the audit log. */
export function EditMatchSheet({ open, onClose, session, match }: Props) {
  const prePlay = ['Proposed', 'AwaitingConfirmation', 'Ready'].includes(match.status)
  const started = ['Playing', 'PendingResult'].includes(match.status)
  const canChange = EDITABLE.includes(match.status)
  const perTeam = match.teamA.length
  const original = [...match.teamA, ...match.teamB].map((p) => p.player.userId)
  const freeCourts = session.courts.filter((c) => c.status === 'Available' && !c.match)

  const [court, setCourt] = useState(freeCourts[0]?.number ?? 0)

  // Everyone who can come onto this court, and where they'd come from.
  const otherCourts = session.courts.filter((c) => c.match && c.match.id !== match.id && EDITABLE.includes(c.match.status))
  const people = new Map<string, PlayerCard>(session.participants.map((p) => [p.player.userId, p.player]))
  for (const c of session.courts) for (const p of [...(c.match?.teamA ?? []), ...(c.match?.teamB ?? [])]) people.set(p.player.userId, p.player)
  const sources: PickSource[] = [
    { label: 'Waitlist', ids: session.participants.filter((p) => p.status === 'Waiting').map((p) => p.player.userId) },
    ...otherCourts.map((c) => ({
      label: `On court ${c.number} (they trade places)`,
      ids: [...c.match!.teamA, ...c.match!.teamB].map((p) => p.player.userId),
      tag: () => `Court ${c.number}`,
    })),
    { label: 'Checked out', ids: session.participants.filter((p) => p.status === 'Paused').map((p) => p.player.userId), tag: () => 'Checked out' },
  ]

  const save = useSessionAction(session.id, ({ a, b }: { a: string[]; b: string[] }) => matchApi.setLineup(session.id, match.id, a, b))
  const move = useSessionAction(session.id, () => matchApi.move(session.id, match.id, court))
  const cancel = useSessionAction(session.id, () => matchApi.cancel(session.id, match.id))
  const voidMatch = useSessionAction(session.id, () => matchApi.void(session.id, match.id))
  const error = save.error ?? move.error ?? cancel.error ?? voidMatch.error
  const done = { onSuccess: onClose }

  return (
    <Sheet open={open} onClose={onClose} title={`Edit court ${match.courtNumber}`}>
      <div className="space-y-6">
        {canChange ? (
          <LineupEditor
            title="On Court"
            original={original}
            perTeam={perTeam}
            people={people}
            sources={sources}
            partnerOf={new Map(session.participants.filter((p) => p.partnerId).map((p) => [p.player.userId, p.partnerId!]))}
            saving={save.isPending}
            onSave={(a, b) => save.mutate({ a, b }, done)}
            onCancel={onClose}
          />
        ) : (
          <p className="text-sm text-muted">A score has been entered, so the players can't be changed.</p>
        )}

        {canChange && freeCourts.length > 0 && (
          <section>
            <SectionTitle>Move this game to another court</SectionTitle>
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
