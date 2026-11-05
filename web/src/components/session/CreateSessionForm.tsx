import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check, ChevronDown, Minus, Plus, Scale, Users } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { sessionApi } from '../../api/api'
import type { QueueMode, SessionSettings } from '../../api/types'
import { queryKeys } from '../../hooks/queries'
import { Button } from '../ui/Button'
import { ErrorNote, Field, Toggle } from '../ui/primitives'

function nowLocal() {
  const d = new Date()
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const DEFAULT_SETTINGS: SessionSettings = {
  mode: 'FairMatch',
  skillTolerance: 1,
  confirmationWindowSeconds: 0, // automatic queueing: no accepting match calls
  waitProtectionMinutes: 20,
  pointsToWin: 11,
  winBy: 1, // no deuce: first to 11 wins
  autoMatchmaking: true,
  openAdmission: true,
}

/**
 * Start a doubles open-play session in three easy steps: how turns work, how many courts, and an
 * optional name. Everything else has sensible defaults and can be changed later in Manage.
 */
export function CreateSessionForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<QueueMode>('FairMatch')
  const [courts, setCourts] = useState(2)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [when, setWhen] = useState(nowLocal)
  const [more, setMore] = useState(false)
  const [deuce, setDeuce] = useState(false)

  const create = useMutation({
    mutationFn: async () => {
      const created = await sessionApi.create({
        title: title.trim() || 'Open Play',
        location: location.trim() || 'Pickleball courts',
        scheduledAt: new Date(when).toISOString(),
        format: 'Doubles',
        courtCount: courts,
        settings: { ...DEFAULT_SETTINGS, mode, winBy: deuce ? 2 : 1 },
      })
      // Not started yet: players can join and check in; games begin when the organizer taps Start session.
      return created
    },
    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.mySessions })
      navigate(`/sessions/${id}?tab=session`, { replace: true })
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate()
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Step n={1} title="How should players take turns?">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <ModeCard
            selected={mode === 'FairMatch'}
            onClick={() => setMode('FairMatch')}
            icon={<Users className="size-6" />}
            title="Fair Match"
            badge="Best for most groups"
            text="Everyone gets the same number of games. The app calls the four people who have played the least."
          />
          <ModeCard
            selected={mode === 'SkillBased'}
            onClick={() => setMode('SkillBased')}
            icon={<Scale className="size-6" />}
            title="Skill Based"
            text="Players are grouped by level (Beginner, Novice, Intermediate), so games stay even. Good when levels differ a lot."
          />
        </div>
        <p className="mt-2 text-xs text-muted">Not sure? Pick Fair Match. You can switch later.</p>
      </Step>

      <Step n={2} title="How many courts do you have?">
        <div className="flex items-center gap-3">
          <RoundButton label="Fewer courts" onClick={() => setCourts((c) => Math.max(1, c - 1))} disabled={courts <= 1} icon={<Minus className="size-5" />} />
          <span className="w-12 text-center font-display text-4xl font-extrabold">{courts}</span>
          <RoundButton label="More courts" onClick={() => setCourts((c) => Math.min(6, c + 1))} disabled={courts >= 6} icon={<Plus className="size-5" />} />
          <span className="text-sm text-muted">
            4 players per court · {courts * 4} playing at once
          </span>
        </div>
      </Step>

      <Step n={3} title="Give it a name (optional)">
        <Field label="Session name" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Open Play" />
        <button type="button" onClick={() => setMore((m) => !m)} className="mt-3 flex items-center gap-1 text-sm font-semibold text-white/75">
          Location, time and deuce <ChevronDown className={clsx('size-4 transition', more && 'rotate-180')} />
        </button>
        {more && (
          <div className="mt-3 space-y-4">
            <Field label="Location" name="location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder="Riverside Park Courts" />
            <Field label="Date and time" name="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-night/70 p-3">
              <span>
                <span className="block font-semibold">Play deuce</span>
                <span className="block text-sm text-muted">{deuce ? 'Win by 2: at 10–10 play on until someone leads by 2.' : 'No deuce: first to 11 wins, even 11–10.'}</span>
              </span>
              <Toggle label="Play deuce" checked={deuce} onChange={setDeuce} />
            </label>
          </div>
        )}
      </Step>

      <ErrorNote error={create.error} />
      <Button type="submit" block size="lg" loading={create.isPending} icon={<Check className="size-6" />}>
        Start session
      </Button>
      <p className="text-center text-xs text-muted">Games to 11{deuce ? ', win by 2' : ', no deuce'}. Next you'll get a QR code for players to check in.</p>
    </form>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 flex items-center gap-2 font-display text-lg font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-lime text-sm font-extrabold text-ink">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function ModeCard({ selected, onClick, icon, title, text, badge }: { selected: boolean; onClick: () => void; icon: ReactNode; title: string; text: string; badge?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={clsx(
        'relative flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition',
        selected ? 'border-lime bg-lime/10 shadow-[0_0_20px_-8px_rgb(183_243_59/0.9)]' : 'border-white/10 bg-night/70 hover:border-white/30',
      )}
    >
      <span className={clsx('grid size-11 shrink-0 place-items-center rounded-full', selected ? 'bg-lime text-ink' : 'bg-white/10 text-white/80')}>{icon}</span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5 font-display text-lg leading-tight font-bold">
          {title}
          {badge && <span className="rounded-full bg-lime/15 px-2 py-0.5 font-sans text-[11px] font-semibold text-lime">{badge}</span>}
        </span>
        <span className="mt-0.5 block text-sm text-white/75">{text}</span>
      </span>
    </button>
  )
}

function RoundButton({ label, onClick, disabled, icon }: { label: string; onClick: () => void; disabled: boolean; icon: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="grid size-11 place-items-center rounded-full border border-white/15 bg-surface disabled:opacity-40">
      {icon}
    </button>
  )
}
