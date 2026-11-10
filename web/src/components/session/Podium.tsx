import clsx from 'clsx'
import type { Participant } from '../../api/types'
import { winRateText } from '../../lib/format'
import { PlayerAvatar } from '../character/Stage'
import { rankPlayers } from './ranking'
import { Sparkles } from 'lucide-react'
import { PlayerName } from '../character/NameTag'

/** Each place celebrates differently: 1st jumps with both arms up, 2nd waves the paddle high, 3rd claps. */
const POSE: Record<number, 'champion' | 'cheer' | 'clap'> = { 1: 'champion', 2: 'cheer', 3: 'clap' }

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
      <Confetti />
      <h2 className="relative text-center font-display text-2xl font-extrabold">{title}</h2>
      <div className="relative mt-4 flex items-end justify-center gap-2 sm:gap-4">
        {STEPS.map((step) => {
          const p = ranked[step.place - 1]
          return (
            <div key={step.place} className="flex w-28 flex-col items-center sm:w-36">
              {p ? (
                <>
                  {/* Live, moving 3D characters (not draggable), wearing their aura and effects. */}
                  <div className="relative">
                    {step.place === 1 && (
                      <>
                        <div className="podium-spotlight pointer-events-none absolute -inset-x-6 -top-10 bottom-0" aria-hidden />
                        <Sparkles className="podium-twinkle absolute -top-1 right-0 size-5 text-amber-300" aria-hidden />
                        <Sparkles className="podium-twinkle absolute top-1/3 -left-2 size-4 text-amber-300 [animation-delay:0.7s]" aria-hidden />
                      </>
                    )}
                  <PlayerAvatar
                    player={p.player}
                    variant="full"
                    live
                    pose={POSE[step.place]}
                    className={clsx('relative', step.place === 1 ? 'w-28 sm:w-40' : 'w-24 sm:w-32')}
                  />
                  </div>
                  <div className="mt-1.5 flex max-w-full min-w-0 justify-center text-center font-semibold">
                    <PlayerName player={p.player} truncate />
                  </div>
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

const CONFETTI_COLORS = ['#B7F33B', '#A348FA', '#FBBF24', '#3BC6F3', '#FF5CA8', '#FFFFFF']

/** Confetti drifting down over the podium. CSS only; switched off for people who prefer reduced motion. */
export function Confetti() {
  const pieces = Array.from({ length: 36 }, (_, i) => i)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${((i * 0.43) % 4).toFixed(2)}s`,
            animationDuration: `${3.2 + ((i * 7) % 10) / 4}s`,
            width: i % 3 === 0 ? 6 : 8,
            height: i % 3 === 0 ? 12 : 6,
            borderRadius: i % 4 === 0 ? 9999 : 2,
          }}
        />
      ))}
    </div>
  )
}
