import type { SessionDetail } from '../../api/types'
import { CourtCard } from '../../components/court/CourtCard'
import { MatchActions } from '../../components/court/MatchActions'
import { Leaderboard } from '../../components/session/Leaderboard'
import { MatchHistoryList } from '../../components/session/MatchHistoryList'
import { SectionTitle, StatTile } from '../../components/ui/primitives'
import { winRateText } from '../../lib/format'

/** Standings: the session leaderboard, your record and court, and your verified games. */
export function MyGamesTab({ session }: { session: SessionDetail }) {
  const me = session.me
  const myCourt = session.myMatch ? session.courts.find((c) => c.number === session.myMatch!.courtNumber) : undefined

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="lg:row-span-3">
        <SectionTitle>Leaderboard</SectionTitle>
        <Leaderboard players={session.participants} meId={me?.player.userId} />
        <p className="mt-2 text-xs text-muted">Ranked by wins, then win rate, then games played. Only verified results count.</p>
      </section>

      <section>
        <SectionTitle>Me this session</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          <StatTile label="Games" value={me?.completedGames ?? 0} />
          <StatTile label="Wins" value={me?.wins ?? 0} accent />
          <StatTile label="Losses" value={me?.losses ?? 0} />
          <StatTile label="Win rate" value={winRateText(me?.winRate ?? null)} />
        </div>
      </section>

      {myCourt && session.myMatch && (
        <section>
          <SectionTitle>My court</SectionTitle>
          <CourtCard court={myCourt} format={session.format} actions={<MatchActions session={session} match={session.myMatch} />} />
        </section>
      )}

      <section>
        <SectionTitle>Played this session</SectionTitle>
        <MatchHistoryList items={session.myGames} empty="No verified games yet." />
      </section>
    </div>
  )
}
