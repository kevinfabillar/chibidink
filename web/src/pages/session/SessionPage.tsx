import clsx from 'clsx'
import { Users } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import type { SessionDetail } from '../../api/types'
import { Podium } from '../../components/session/Podium'
import { Logo, Spinner } from '../../components/ui/primitives'
import { useSession } from '../../hooks/queries'
import { useSessionHub, type LiveStatus } from '../../realtime/useSessionHub'
import { CourtsTab } from './CourtsTab'
import { ManageTab } from './ManageTab'
import { MyGamesTab } from './MyGamesTab'
import { MyMatchBanner } from './MyMatchBanner'
import { GiveKudosButton } from '../../components/session/KudosPanel'
import { SessionInfoTab } from './SessionInfoTab'
import { SessionBottomNav } from './SessionNav'
import { sessionTabs, type SessionTab } from './sessionTabs'
import { PageError } from '../../components/ui/ErrorPage'

export function SessionPage() {
  const { sessionId } = useParams()
  const [params, setParams] = useSearchParams()
  const session = useSession(sessionId)
  const live = useSessionHub(sessionId)

  if (session.isLoading) return <Spinner label="Loading session" />
  if (!session.data) return <PageError error={session.error} onRetry={() => session.refetch()} />
  const s = session.data

  const requested = params.get('tab') as SessionTab | 'manage' | null
  const tab: SessionTab = requested === 'manage' ? 'session' : sessionTabs.some((t) => t.id === requested) ? (requested as SessionTab) : 'courts'
  const waiting = s.participants.filter((p) => p.status === 'Waiting').length

  return (
    <div className="mx-auto max-w-7xl">
      <SessionHeader session={s} live={live} />
      {s.status === 'Closed' && <Podium players={s.participants} />}
      {s.myMatch && tab !== 'courts' && tab !== 'games' && <MyMatchBanner session={s} match={s.myMatch} />}
      <GiveKudosButton sessionId={s.id} />

      {/* Desktop tabs; phones use the bottom nav */}
      <div role="tablist" className="mb-5 hidden gap-1.5 rounded-2xl border border-white/8 bg-night/70 p-1.5 lg:flex">
        {sessionTabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={clsx(
              'flex h-10 flex-1 items-center justify-center gap-2 rounded-xl font-display text-base font-bold transition',
              tab === t.id ? 'bg-lime text-ink' : 'text-white/70 hover:bg-white/8',
            )}
          >
            <t.icon className="size-4.5" />
            {t.id === 'courts' ? `Queue (${waiting})` : t.id === 'session' && s.isOrganizer ? 'Manage' : t.label}
          </button>
        ))}
      </div>

      {tab === 'courts' && <CourtsTab session={s} />}
      {tab === 'games' && <MyGamesTab session={s} />}
      {tab === 'session' && (s.isOrganizer ? <ManageTab session={s} /> : <SessionInfoTab session={s} />)}

      <SessionBottomNav sessionId={s.id} tab={tab} />
    </div>
  )
}

function SessionHeader({ session: s, live }: { session: SessionDetail; live: LiveStatus }) {
  const players = (
    <span className="pill border-white/20 bg-ink/50 text-white/90">
      <Users className="size-4" />
      {s.participants.length} Players
    </span>
  )
  const badge =
    s.status === 'Closed'
      ? { text: 'CLOSED', cls: 'border-white/20 text-white/50', dot: 'bg-white/40' }
      : s.status === 'Active'
        ? { text: live === 'live' ? 'LIVE' : 'RECONNECTING', cls: 'border-lime text-lime shadow-[0_0_14px_-4px_rgb(183_243_59/0.9)]', dot: 'bg-lime animate-pulse' }
        : { text: 'NOT STARTED', cls: 'border-sky/70 text-sky', dot: 'bg-sky' }
  const status = (
    <span className={clsx('pill bg-ink/50 font-display tracking-wide', badge.cls)}>
      <span className={clsx('size-2 rounded-full', badge.dot)} />
      {badge.text}
    </span>
  )

  return (
    <header className="mb-4">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <Link to="/" aria-label="Home">
          <Logo className="h-12" />
        </Link>
        <div className="flex gap-1.5">{status}</div>
      </div>
      <div className="mt-3 flex flex-col items-center text-center lg:mt-0 lg:flex-row lg:justify-between lg:text-left">
        <div>
          <h1 className="font-display text-[1.75rem] leading-tight font-extrabold md:text-4xl">{s.title}</h1>
          <p className="text-white/80">
            {s.courts.length} Courts • Doubles • {s.settings.mode === 'SkillBased' ? 'Skill Based' : 'Fair Match'}
          </p>
        </div>
        <div className="mt-2 flex gap-2 md:mt-0">
          {players}
          <span className="hidden lg:inline-flex">{status}</span>
        </div>
      </div>
    </header>
  )
}
