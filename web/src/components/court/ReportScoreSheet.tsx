import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { sessionApi } from '../../api/api'
import type { Match, MatchPlayer, SessionDetail } from '../../api/types'
import { useSessionAction } from '../../hooks/queries'
import { teamNames } from '../../lib/format'
import { scoreProblem } from '../../lib/scoring'
import { Button } from '../ui/Button'
import { ErrorNote } from '../ui/primitives'
import { Sheet } from '../ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  session: SessionDetail
  match: Match
  /** Sends the score. The sheet closes straight away; saving finishes in the background. */
  onSubmit: (teamAScore: number, teamBScore: number, notes?: string) => void
}


/** Organizer enters the final score; it ends the game and the next four go on this court. */
export function ReportScoreSheet({ open, onClose, session, match, onSubmit }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={`Court ${match.courtNumber} result`}>
      {/* Mounted per opening and per match, so it always starts fresh for the game on court now. */}
      {open && (
        <ScoreForm
          key={match.id}
          session={session}
          match={match}
          onSubmit={(a, b, notes) => {
            onSubmit(a, b, notes)
            onClose()
          }}
        />
      )}
    </Sheet>
  )
}

function ScoreForm({ session, match, onSubmit }: { session: SessionDetail; match: Match; onSubmit: (a: number, b: number, notes?: string) => void }) {
  const { pointsToWin, winBy } = session.settings
  const [a, setA] = useState(pointsToWin)
  const [b, setB] = useState(0)
  const [notes, setNotes] = useState('')
  const problem = scoreProblem(a, b, pointsToWin, winBy)
  // The score only fails because of deuce (e.g. 11–10): offer to play this session without it.
  const deuceOnly = winBy > 1 && problem !== null && scoreProblem(a, b, pointsToWin, 1) === null
  const noDeuce = useSessionAction(session.id, () =>
    sessionApi.update(session.id, {
      title: session.title,
      location: session.location,
      scheduledAt: session.scheduledAt,
      settings: { ...session.settings, winBy: 1 },
    }),
  )

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Game to {pointsToWin}, {winBy > 1 ? 'deuce (win by 2)' : 'no deuce'}. Your entry is final: the game ends and the next four go on this court.
      </p>
      <div className="space-y-3">
        <ScoreRow label="Team A" players={match.teamA} value={a} onChange={setA} accent="lime" />
        <ScoreRow label="Team B" players={match.teamB} value={b} onChange={setB} accent="grape" />
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-semibold text-white/85">Notes (optional)</span>
        <textarea
          value={notes}
          maxLength={280}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-2xl border border-white/10 bg-night px-4 py-3 text-white focus:border-lime/70 focus:outline-none"
        />
      </label>
      <div className="mt-4 space-y-3">
        {problem && (
          <div className="space-y-2 rounded-2xl border border-amber-300/40 bg-amber-300/10 px-4 py-2.5 text-sm text-amber-100">
            <p>{problem}</p>
            {deuceOnly && (
              <Button variant="dark" size="sm" loading={noDeuce.isPending} onClick={() => noDeuce.mutate()}>
                Switch to no deuce (11–10 wins)
              </Button>
            )}
          </div>
        )}
        <ErrorNote error={noDeuce.error} />
        <Button block size="lg" disabled={!!problem} onClick={() => onSubmit(a, b, notes || undefined)}>
          Submit {a}–{b}
        </Button>
      </div>
    </div>
  )
}

function ScoreRow({
  label,
  players,
  value,
  onChange,
  accent,
}: {
  label: string
  players: MatchPlayer[]
  value: number
  onChange: (v: number) => void
  accent: 'lime' | 'grape'
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border bg-night/70 p-3 ${accent === 'lime' ? 'border-lime/30' : 'border-grape/40'}`}>
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg font-bold">{label}</div>
        <div className="truncate text-sm text-muted">{teamNames(players.map((p) => p.player.displayName))}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="grid size-11 place-items-center rounded-xl bg-surface-2 hover:bg-white/10"
        aria-label={`${label} minus one`}
      >
        <Minus className="size-5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={99}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(Math.max(0, Math.min(99, Math.floor(Number(e.target.value)) || 0)))}
        className="h-11 w-16 rounded-xl border border-white/10 bg-ink text-center font-display text-2xl font-extrabold focus:border-lime/70 focus:outline-none"
        aria-label={`${label} score`}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(99, value + 1))}
        className="grid size-11 place-items-center rounded-xl bg-surface-2 hover:bg-white/10"
        aria-label={`${label} plus one`}
      >
        <Plus className="size-5" />
      </button>
    </div>
  )
}
