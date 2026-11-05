import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { ChevronRight, LogIn, Megaphone, QrCode, Sparkles, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { sessionApi } from '../api/api'
import type { SessionSummary } from '../api/types'
import { PlayerAvatar } from '../components/character/Stage'
import { CreateSessionForm } from '../components/session/CreateSessionForm'
import { JoinCodeForm } from '../components/session/JoinCodeForm'
import { ErrorNote, Spinner } from '../components/ui/primitives'
import { TopBar } from '../components/ui/TopBar'
import { useAuth } from '../auth/authStore'
import { useMe, useMySessions } from '../hooks/queries'

type Choice = 'join' | 'host'

/**
 * The Queue page: the easy way into doubles open play. Join a game with the host's code or QR,
 * or host one in three steps (Fair Match or Skill Based, courts, name).
 */
export function FindMatchPage() {
  const me = useMe().data
  const sessions = useMySessions()
  const open = (sessions.data ?? []).filter((s) => s.status !== 'Closed')
  const isGuest = useAuth((s) => s.guest)
  const [picked, setChoice] = useState<Choice | null>(null)
  // Default: join if you already have a session going, otherwise host one.
  const choice: Choice = isGuest ? 'join' : (picked ?? (open.length > 0 ? 'join' : 'host'))

  if (!me || sessions.isLoading) return <Spinner />
  // Already in a session (open or live)? Go straight to it: live first, then the newest open one.
  const current = open.find((s) => s.status === 'Active') ?? open[0]
  if (current) return <Navigate to={`/sessions/${current.id}`} replace />

  return (
    <div className="mx-auto max-w-2xl">
      <TopBar title="Queue" sub="Doubles open play: check in, and the app calls the next four to the court." />

      <div className="mb-5 flex items-end justify-center">
        <PlayerAvatar player={me.player} variant="full" animated className="w-32" />
      </div>

      {isGuest && <p className="card mb-4 p-3 text-center text-sm text-white/75">You're playing as a guest. Create an account to host your own sessions.</p>}
      <div role="tablist" className={clsx('mb-5 grid grid-cols-2 gap-2.5', isGuest && 'hidden')}>
        <BigChoice selected={choice === 'join'} onClick={() => setChoice('join')} icon={<LogIn className="size-6" />} title="Join a game" text="I have a code or QR" />
        <BigChoice selected={choice === 'host'} onClick={() => setChoice('host')} icon={<Megaphone className="size-6" />} title="Host a game" text="Start a session" />
      </div>

      {choice === 'join' ? <JoinPanel sessions={open} meId={me.player.userId} /> : <HostPanel />}

      <HowItWorks />
    </div>
  )
}

function JoinPanel({ sessions, meId }: { sessions: SessionSummary[]; meId: string }) {
  return (
    <div className="space-y-4">
      <section className="card space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <QrCode className="size-5 text-lime" /> Check in with a code
        </h2>
        <p className="text-sm text-white/70">Ask the host for the 6-letter code, or scan the QR on their screen with your camera.</p>
        <JoinCodeForm />
      </section>
      {sessions.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">Your sessions</h2>
          <div className="space-y-2.5">
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} meId={meId} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SessionRow({ session: s, meId }: { session: SessionSummary; meId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const checkIn = useMutation({
    mutationFn: () => sessionApi.setQueued(s.id, meId, true),
    onSuccess: () => {
      void queryClient.invalidateQueries()
      navigate(`/sessions/${s.id}?tab=courts`)
    },
  })
  const inLine = s.myStatus === 'Waiting' || s.myStatus === 'InMatch'
  const status = s.myStatus === 'Waiting' ? 'Checked in' : s.myStatus === 'InMatch' ? 'On court' : 'Checked out'
  return (
    <div>
      <button
        onClick={() => (inLine ? navigate(`/sessions/${s.id}?tab=courts`) : checkIn.mutate())}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-white/10 bg-surface/80 p-3.5 text-left transition hover:border-lime/60"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-white/80">
          <Users className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg leading-tight font-bold">{s.title}</span>
          <span className="block text-sm text-white/70">
            {s.courtCount} courts · {s.playerCount} players · <span className={inLine ? 'text-lime' : undefined}>{status}</span>
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-lime">
          {inLine ? 'Open' : checkIn.isPending ? 'Checking in…' : 'Check in'} <ChevronRight className="size-4" />
        </span>
      </button>
      <ErrorNote error={checkIn.error} />
    </div>
  )
}

function HostPanel() {
  return (
    <section className="card p-4 sm:p-5">
      <CreateSessionForm />
    </section>
  )
}

function HowItWorks() {
  const steps: [ReactNode, string, string][] = [
    [<Megaphone key="1" className="size-5" />, 'Host starts a session', 'Pick Fair Match or Skill Based and the number of courts.'],
    [<QrCode key="2" className="size-5" />, 'Players check in', 'Scan the QR or type the code at the courts.'],
    [<Sparkles key="3" className="size-5" />, 'The queue runs itself', 'When a court frees up, the next four go on automatically. Play, enter the score, repeat!'],
  ]
  return (
    <section className="mt-6">
      <h2 className="mb-2 font-display text-lg font-bold">How it works</h2>
      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map(([icon, title, text], i) => (
          <li key={title} className="card p-3">
            <div className="mb-1 flex items-center gap-2 text-lime">
              <span className="grid size-6 place-items-center rounded-full bg-lime text-xs font-extrabold text-ink">{i + 1}</span>
              {icon}
            </div>
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-white/65">{text}</div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function BigChoice({ selected, onClick, icon, title, text }: { selected: boolean; onClick: () => void; icon: ReactNode; title: string; text: string }) {
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-1 rounded-2xl border-2 p-3.5 text-center transition',
        selected ? 'border-lime bg-lime/10 shadow-[0_0_20px_-8px_rgb(183_243_59/0.9)]' : 'border-white/10 bg-surface/80 hover:border-white/30',
      )}
    >
      <span className={clsx('grid size-11 place-items-center rounded-full', selected ? 'bg-lime text-ink' : 'bg-white/10 text-white/80')}>{icon}</span>
      <span className="font-display text-lg leading-tight font-bold">{title}</span>
      <span className="text-xs text-white/65">{text}</span>
    </button>
  )
}
