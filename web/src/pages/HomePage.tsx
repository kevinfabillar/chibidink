import clsx from 'clsx'
import { ChevronRight, Gamepad2, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Profile, SessionSummary } from '../api/types'
import { Scene } from '../components/character/Backgrounds'
import { PlayerAvatar } from '../components/character/Stage'
import { JoinCodeForm } from '../components/session/JoinCodeForm'
import { SessionList } from '../components/session/SessionList'
import { ChestIcon, CrossedPaddlesIcon } from '../components/ui/icons'
import { SectionTitle, Spinner } from '../components/ui/primitives'
import { TopBar } from '../components/ui/TopBar'
import { useMe, useMySessions } from '../hooks/queries'
import { winRateText } from '../lib/format'
import { PageError } from '../components/ui/ErrorPage'
import { PlayerName } from '../components/character/NameTag'
import { FriendsStrip } from '../components/social/FriendsEntry'
import { KudosBanner } from '../components/session/KudosBanner'

export function HomePage() {
  const me = useMe()
  const sessions = useMySessions()

  if (me.isLoading) return <Spinner />
  if (!me.data) return <PageError error={me.error} onRetry={() => me.refetch()} />
  const { player, progress, stats } = me.data
  const inLevel = progress.experience - progress.levelStartXp
  const levelSize = progress.nextLevelXp - progress.levelStartXp
  const openSession = (sessions.data ?? []).find((s) => s.status !== 'Closed')

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar logo />

      <section className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] items-center gap-3">
        <Link to="/character" className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-white/10 pt-2" aria-label="My character">
          <Scene id={player.loadout.backgroundId} className="absolute inset-0 size-full" />
          <PlayerAvatar player={player} variant="full" live pedestal animated className="relative w-full max-w-72" />
        </Link>

        <div className="space-y-2">
          <div className="rounded-2xl border border-white/12 bg-ink/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <PlayerName player={player} size="md" className="min-w-0 truncate font-display text-[1.6rem] leading-none font-extrabold" />
              <span className="shrink-0 rounded-lg border border-lime/80 bg-lime/10 px-2 py-0.5 font-display text-base font-bold text-lime">
                Lv {progress.level}
              </span>
            </div>
            <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-lime-deep to-lime" style={{ width: `${Math.min(100, (inLevel / levelSize) * 100)}%` }} />
            </div>
            <div className="mt-1 text-right text-xs text-white/70">
              {inLevel} / {levelSize} XP
            </div>
          </div>

          <SessionStatus profile={me.data} openSession={openSession} />

          <div className="grid grid-cols-2 gap-2">
            <Stat label="Matches" value={stats.matches} />
            <Stat label="Wins" value={stats.wins} />
            <Stat label="Losses" value={stats.losses} />
            <Stat label="Win Rate" value={winRateText(stats.winRate)} />
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <BigButton to="/queue" tone="lime" icon={<CrossedPaddlesIcon className="size-9" />} label="Play Match" />
        <BigButton to="/drills" tone="grape" icon={<Gamepad2 className="size-9" />} label="Pickle Drills" />
      </div>

      <Link
        to="/items"
        className="mt-3 flex items-center gap-3 rounded-2xl border border-grape/70 bg-gradient-to-r from-grape/40 via-grape-deep/25 to-surface/60 p-3 shadow-glow-grape"
      >
        <ChestIcon className="h-11 w-13 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg leading-tight font-extrabold">Start Your Journey!</div>
          <div className="text-xs text-white/85">Play matches to earn XP and coins, unlock items, auras, and customize your character!</div>
        </div>
        <ChevronRight className="size-8 shrink-0 text-lime" />
      </Link>

      {me.data.kudosPrompt && <KudosBanner prompt={me.data.kudosPrompt} />}
      <FriendsStrip />

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section>
          <SectionTitle>Join a session</SectionTitle>
          <div className="card p-4">
            <p className="mb-3 text-sm text-muted">Enter the 6-character code from your organizer, or scan their QR code.</p>
            <JoinCodeForm />
          </div>
        </section>
        <section>
          <SectionTitle>My sessions</SectionTitle>
          {sessions.isLoading ? <Spinner /> : <SessionList sessions={sessions.data ?? []} empty="No sessions yet. Join one with a code or start your own." />}
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink/60 px-2 py-1.5 text-center">
      <div className="text-[11px] font-medium text-white/65">{label}</div>
      <div className="font-display text-xl leading-tight font-extrabold">{value}</div>
    </div>
  )
}

/** Where you are right now. Takes the slot the mockup used for a rank badge (no ranks in ChibiDink). */
function SessionStatus({ profile, openSession }: { profile: Profile; openSession?: SessionSummary }) {
  const active = profile.activeMatch
  if (active)
    return (
      <Link to={`/sessions/${active.sessionId}?tab=games`} className="flex items-center gap-2 rounded-xl border border-lime/60 bg-lime/10 px-3 py-2">
        <CrossedPaddlesIcon className="size-6 shrink-0 text-lime" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base leading-tight font-bold text-lime">Court {active.courtNumber}</span>
          <span className="block truncate text-xs text-white/75">{active.needsAction ? 'Your match needs you' : active.sessionTitle}</span>
        </span>
        <ChevronRight className="size-5 text-lime" />
      </Link>
    )
  if (openSession) {
    const status = openSession.myStatus === 'Waiting' ? 'Checked in' : openSession.myStatus === 'InMatch' ? 'On court' : 'Checked out'
    return (
      <Link to={`/sessions/${openSession.id}`} className="flex items-center gap-2 rounded-xl border border-white/12 bg-ink/60 px-3 py-2">
        <MapPin className="size-5 shrink-0 text-lime" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base leading-tight font-bold">{status}</span>
          <span className="block truncate text-xs text-white/70">{openSession.title}</span>
        </span>
        <ChevronRight className="size-5 text-white/50" />
      </Link>
    )
  }
  return (
    <Link to="/queue" className="flex items-center gap-2 rounded-xl border border-white/12 bg-ink/60 px-3 py-2">
      <MapPin className="size-5 shrink-0 text-white/60" />
      <span className="flex-1 font-display text-base font-bold text-white/80">No session yet</span>
      <ChevronRight className="size-5 text-white/50" />
    </Link>
  )
}

function BigButton({ to, tone, icon, label }: { to: string; tone: 'lime' | 'grape'; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className={clsx(
        'flex h-24 flex-col items-center justify-center gap-1 rounded-2xl font-display text-xl font-extrabold transition active:scale-[0.97]',
        tone === 'lime'
          ? 'bg-gradient-to-b from-[#D4FF6A] to-lime text-ink shadow-[0_8px_28px_-8px_rgb(183_243_59/0.9),inset_0_-3px_0_rgb(0_0_0/0.15)]'
          : 'border border-[#C084FC]/60 bg-gradient-to-b from-[#B56BFF] to-grape-deep text-snow shadow-[0_8px_28px_-8px_rgb(163_72_250/0.9),inset_0_-3px_0_rgb(0_0_0/0.2)]',
      )}
    >
      {icon}
      {label}
    </Link>
  )
}
