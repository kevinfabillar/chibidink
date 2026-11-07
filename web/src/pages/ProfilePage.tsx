import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { profileApi } from '../api/api'
import { PlayerAvatar } from '../components/character/Stage'
import { MatchHistoryList } from '../components/session/MatchHistoryList'
import { SessionList } from '../components/session/SessionList'
import { SignOutButton } from '../components/layout/SignOutButton'
import { Spinner } from '../components/ui/primitives'
import { TopBar } from '../components/ui/TopBar'
import { queryKeys } from '../hooks/queries'
import { winRateText } from '../lib/format'
import { PageError } from '../components/ui/ErrorPage'
import clsx from 'clsx'
import { BarChart3, CalendarDays, ChartNoAxesColumnIncreasing, Layers, Pencil, Swords, Trophy, User, Users, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Profile } from '../api/types'
import { EditProfileSheet } from '../components/profile/EditProfileSheet'
import { Button } from '../components/ui/Button'

/** Verified pickleball record. Only organizer- or opponent-verified matches count. */
export function ProfilePage() {
  const { userId } = useParams()
  const [editing, setEditing] = useState(false)
  const profile = useQuery({
    queryKey: userId ? queryKeys.player(userId) : queryKeys.me,
    queryFn: () => (userId ? profileApi.player(userId) : profileApi.me()),
  })

  if (profile.isLoading) return <Spinner />
  if (!profile.data) return <PageError error={profile.error} onRetry={() => profile.refetch()} />
  const { player, stats, recentMatches, sessions, progress } = profile.data
  const rate = (w: number, l: number) => winRateText(w + l === 0 ? null : (w * 100) / (w + l))

  return (
    <div className="mx-auto max-w-6xl">
      <TopBar back="/" title={userId ? player.displayName : 'My Record'} sub="Verified real-life matches only." />
      {!userId && <EditProfileSheet open={editing} onClose={() => setEditing(false)} profile={profile.data as unknown as Profile} />}

      <div className="grid gap-5 md:grid-cols-[17rem_minmax(0,1fr)] md:items-start">
        {/* Character card (stays in view on desktop) */}
        <section className="card flex flex-col items-center p-5 md:sticky md:top-6">
          <PlayerAvatar player={player} variant="full" live pedestal animated className="w-56" />
          <div className="mt-2 font-display text-2xl font-bold">{player.displayName}</div>
          <div className="mt-1 rounded-full bg-lime/20 px-3 py-0.5 text-sm font-semibold text-lime">Character Lv {progress.level}</div>
          {!userId && (
            <div className="mt-5 w-full space-y-2">
              <Button variant="dark" block icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                Edit profile
              </Button>
              <SignOutButton />
              <p className="mt-3 text-center text-xs text-muted">
                <Link to="/terms" className="hover:text-lime">Terms of Service</Link> · <Link to="/privacy" className="hover:text-lime">Privacy Policy</Link>
              </p>
            </div>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <section>
            <Heading icon={<BarChart3 className="size-5" />}>Match Record</Heading>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <RecordTile icon={<Swords className="size-5" />} tone="grape" label="Matches" value={stats.matches} />
              <RecordTile icon={<Trophy className="size-5" />} tone="lime" label="Wins" value={stats.wins} accent />
              <RecordTile icon={<X className="size-5" />} tone="red" label="Losses" value={stats.losses} />
              <RecordTile icon={<ChartNoAxesColumnIncreasing className="size-5" />} tone="grape" label="Win rate" value={winRateText(stats.winRate)} />
            </div>
          </section>

          <section>
            <Heading icon={<Layers className="size-5" />}>Game Breakdown</Heading>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <BreakdownCard icon={<Users className="size-5" />} label="Doubles" wins={stats.doublesWins} losses={stats.doublesLosses} rate={rate(stats.doublesWins, stats.doublesLosses)} />
              <BreakdownCard icon={<User className="size-5" />} label="Singles" wins={stats.singlesWins} losses={stats.singlesLosses} rate={rate(stats.singlesWins, stats.singlesLosses)} />
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="card min-w-0 p-4">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
                <CalendarDays className="size-5 text-grape" /> Recent matches
              </h2>
              <MatchHistoryList items={recentMatches} empty="No verified matches yet." />
            </section>
            <section className="card min-w-0 p-4">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
                <Layers className="size-5 text-grape" /> Sessions
              </h2>
              <SessionList sessions={sessions} empty="No sessions yet." />
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Section title with an icon and a thin line running to the right edge. */
function Heading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
      <span className="text-grape">{icon}</span>
      {children}
      <span className="ml-2 h-px flex-1 bg-white/12" aria-hidden />
    </h2>
  )
}

const TONES = {
  grape: 'bg-grape/15 text-grape',
  lime: 'bg-lime/20 text-lime',
  red: 'bg-danger/15 text-danger',
} as const

function RecordTile({ icon, tone, label, value, accent }: { icon: ReactNode; tone: keyof typeof TONES; label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="card flex items-center gap-3 p-3.5">
      <span className={clsx('grid size-11 shrink-0 place-items-center rounded-xl', TONES[tone])}>{icon}</span>
      <div className="min-w-0">
        <div className="text-sm text-muted">{label}</div>
        <div className={clsx('font-display text-2xl leading-tight font-extrabold', accent && 'text-lime')}>{value}</div>
      </div>
    </div>
  )
}

function BreakdownCard({ icon, label, wins, losses, rate }: { icon: ReactNode; label: string; wins: number; losses: number; rate: string }) {
  return (
    <div className="card relative flex items-center gap-3 overflow-hidden p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-grape/15 text-grape">{icon}</span>
      <div className="relative z-10 min-w-0">
        <div className="text-sm text-muted">{label}</div>
        <div className="font-display text-xl font-bold">
          {wins}W {losses}L · {rate}
        </div>
      </div>
      {/* Decoration */}
      <span className="pointer-events-none absolute -right-3 -bottom-5 text-grape/15" aria-hidden>
        {label === 'Doubles' ? <Users className="size-24" /> : <User className="size-24" />}
      </span>
    </div>
  )
}
