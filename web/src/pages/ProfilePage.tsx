import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { profileApi } from '../api/api'
import { PlayerAvatar } from '../components/character/Stage'
import { MatchHistoryList } from '../components/session/MatchHistoryList'
import { SessionList } from '../components/session/SessionList'
import { SignOutButton } from '../components/layout/SignOutButton'
import { SectionTitle, Spinner, StatTile } from '../components/ui/primitives'
import { TopBar } from '../components/ui/TopBar'
import { queryKeys } from '../hooks/queries'
import { winRateText } from '../lib/format'
import { PageError } from '../components/ui/ErrorPage'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
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
    <div className="mx-auto max-w-5xl">
      <TopBar back="/" title={userId ? player.displayName : 'My Record'} sub="Verified real-life matches only." />
      {!userId && <EditProfileSheet open={editing} onClose={() => setEditing(false)} profile={profile.data as unknown as Profile} />}

      <div className="grid gap-5 md:grid-cols-[18rem_1fr]">
        <section className="card flex flex-col items-center p-5">
          <PlayerAvatar player={player} variant="full" live pedestal animated className="w-60" />
          <div className="mt-2 font-display text-2xl font-bold">{player.displayName}</div>
          <div className="text-sm text-lime">Character Lv {progress.level}</div>
          {!userId && (
            <div className="mt-4 w-full space-y-2">
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

        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Matches" value={stats.matches} />
            <StatTile label="Wins" value={stats.wins} accent />
            <StatTile label="Losses" value={stats.losses} />
            <StatTile label="Win rate" value={winRateText(stats.winRate)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="card p-4">
              <div className="text-sm text-muted">Doubles</div>
              <div className="font-display text-xl font-bold">
                {stats.doublesWins}W {stats.doublesLosses}L · {rate(stats.doublesWins, stats.doublesLosses)}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-muted">Singles</div>
              <div className="font-display text-xl font-bold">
                {stats.singlesWins}W {stats.singlesLosses}L · {rate(stats.singlesWins, stats.singlesLosses)}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle>Recent matches</SectionTitle>
          <MatchHistoryList items={recentMatches} empty="No verified matches yet." />
        </section>
        <section>
          <SectionTitle>Sessions</SectionTitle>
          <SessionList sessions={sessions} empty="No sessions yet." />
        </section>
      </div>
    </div>
  )
}
