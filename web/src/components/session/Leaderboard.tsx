import clsx from 'clsx'
import { Crown, Trophy } from 'lucide-react'
import type { Participant } from '../../api/types'
import { winRateText } from '../../lib/format'
import { PlayerAvatar } from '../character/Stage'
import { placeLabel, rankPlayers } from './ranking'
import { EmptyState } from '../ui/EmptyState'
import { PlayerName } from '../character/NameTag'

const MEDAL = ['#FBBF24', '#CBD5E1', '#D9925B']

/** Session standings: most wins, then best win rate, then tiebreakers (see ranking.ts). Shared places show as "T-2". */
export function Leaderboard({ players, meId }: { players: Participant[]; meId?: string }) {
  const ranked = rankPlayers(players)
  if (ranked.length === 0)
    return <EmptyState icon={<Trophy className="size-7" />} title="No results yet" text="The leaderboard fills in as games finish." />
  return (
    <ol className="card divide-y divide-white/8 overflow-hidden">
      {ranked.map((p, i) => {
        const place = p.rank ?? i + 1
        const medal = MEDAL[place - 1]
        return (
        <li key={p.player.userId} className={clsx('flex items-center gap-3 px-3 py-2.5', p.player.userId === meId && 'bg-lime/8')}>
          <span
            className={clsx('flex w-9 flex-col items-center font-display text-lg leading-none font-extrabold', !medal && 'text-white/60')}
            style={medal ? { color: medal } : undefined}
          >
            {medal ? <Trophy className="size-5" /> : placeLabel(p, i)}
            {medal && p.rankTied && <span className="mt-0.5 text-[10px]">{placeLabel(p, i)}</span>}
          </span>
          <PlayerAvatar player={p.player} size={38} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-semibold [overflow-wrap:anywhere] leading-tight">
              <PlayerName player={p.player} />
              {p.role === 'Organizer' && <Crown className="size-3.5 text-lime" aria-label="Organizer" />}
            </div>
            <div className="text-xs text-muted">
              {p.completedGames} games · {winRateText(p.winRate)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-extrabold text-lime">{p.wins}W</div>
            <div className="text-xs text-white/60">{p.losses}L</div>
          </div>
        </li>
        )
      })}
    </ol>
  )
}
