import clsx from 'clsx'
import type { Participant } from '../../api/types'
import { winRateText } from '../../lib/format'
import { PlayerAvatar } from '../character/Stage'
import { rankPlayers } from './ranking'

const STEPS = [
  { place: 2, height: 'h-20', color: '#CBD5E1', label: '2nd' },
  { place: 1, height: 'h-28', color: '#FBBF24', label: '1st' },
  { place: 3, height: 'h-14', color: '#D9925B', label: '3rd' },
]

/** End-of-session podium: the top three on their steps, characters standing on top. */
export function Podium({ players, title = 'Session champions' }: { players: Participant[]; title?: string }) {
  const ranked = rankPlayers(players)
  if (ranked.length === 0) return null
  return (
    <section className="card relative mb-5 overflow-hidden p-5 pb-0">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_100%,rgb(251_191_36/0.25),transparent_70%)]" />
      <h2 className="relative text-center font-display text-2xl font-extrabold">{title}</h2>
      <div className="relative mt-4 flex items-end justify-center gap-2 sm:gap-4">
        {STEPS.map((step) => {
          const p = ranked[step.place - 1]
          return (
            <div key={step.place} className="flex w-28 flex-col items-center sm:w-36">
              {p ? (
                <>
                  <PlayerAvatar player={p.player} variant="full" pose={step.place === 1 ? 'victory' : 'idle'} className={step.place === 1 ? 'w-28 sm:w-36' : 'w-24 sm:w-28'} />
                  <div className="mt-1 max-w-full truncate text-center font-semibold">{p.player.displayName}</div>
                  <div className="text-xs text-muted">
                    {p.wins}W {p.losses}L · {winRateText(p.winRate)}
                  </div>
                </>
              ) : (
                <div className="h-24" />
              )}
              <div
                className={clsx('mt-2 grid w-full place-items-center rounded-t-2xl font-display text-2xl font-extrabold text-ink', step.height)}
                style={{ background: `linear-gradient(180deg, ${step.color}, ${step.color}99)` }}
              >
                {step.label}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
