import clsx from 'clsx'
import { CircleSlash, Clock, Hourglass, Maximize2, Play, Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import type { Court, MatchFormat, MatchPlayer, MatchStatus, Team } from '../../api/types'
import { formatLabel, matchStatusLabel, teamNames } from '../../lib/format'
import { PlayerAvatar } from '../character/Stage'

type Size = 'card' | 'full'
type State = MatchStatus | 'Empty' | 'Unavailable'

interface Props {
  court: Court
  format: MatchFormat
  size?: Size
  onOpen?: () => void
  /** Accept / Decline / Edit buttons under the stage. */
  actions?: ReactNode
  waitingCount?: number
}

const LIME_FRAME =
  'bg-[linear-gradient(180deg,#D4FF6A_0%,#9BE01F_34%,#8B5CF6_74%,#D946EF_100%)] shadow-[0_0_28px_-10px_rgb(183_243_59/0.9),0_18px_36px_-18px_rgb(163_72_250/0.8)]'
const SKY_FRAME =
  'bg-[linear-gradient(180deg,#E6FAFF_0%,#7DD3FC_30%,#8B5CF6_74%,#D946EF_100%)] shadow-[0_0_28px_-10px_rgb(59_198_243/0.8),0_18px_36px_-18px_rgb(163_72_250/0.8)]'

const FRAME: Record<State, string> = {
  Playing: LIME_FRAME,
  Ready: LIME_FRAME,
  Completed: LIME_FRAME,
  Proposed: SKY_FRAME,
  AwaitingConfirmation: SKY_FRAME,
  PendingResult:
    'bg-[linear-gradient(180deg,#F3E8FF_0%,#C084FC_40%,#A348FA_75%,#D946EF_100%)] shadow-[0_0_28px_-10px_rgb(163_72_250/0.9)]',
  Cancelled: 'bg-white/10',
  Voided: 'bg-white/10',
  Empty: 'bg-white/12',
  Unavailable: 'bg-white/6 opacity-60',
}

/** Court header + Team A / VS / Team B stage. The court is a stage, not a playable match. */
export function CourtCard({ court, format, size = 'card', onOpen, actions, waitingCount }: Props) {
  const match = court.match
  const state: State = court.status === 'Unavailable' ? 'Unavailable' : (match?.status ?? 'Empty')
  const full = size === 'full'
  const queued = match?.status === 'AwaitingConfirmation' || match?.status === 'Proposed'

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={clsx('rounded-[1.75rem] p-[2px]', FRAME[state])}>
      <article
        className={clsx(
          'relative overflow-hidden rounded-[calc(1.75rem-2px)] bg-[linear-gradient(180deg,#0F2A1E_0%,#0C1A26_42%,#170F2E_78%,#2B0F47_100%)]',
          full ? 'p-5 md:p-8' : 'p-3.5 sm:p-4',
        )}
        aria-label={`Court ${court.number}`}
      >
        <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full bg-lime/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/2 h-40 w-[90%] -translate-x-1/2 rounded-full bg-grape/25 blur-3xl" />

        <header className="relative flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              'rounded-full border-2 border-lime bg-ink/70 px-3.5 py-0.5 font-display font-extrabold shadow-[0_0_12px_-4px_rgb(183_243_59/0.9)]',
              full ? 'text-2xl' : 'text-lg',
            )}
          >
            Court {court.number}
          </span>
          <span className="rounded-full border border-white/15 bg-ink/50 px-3 py-1 text-sm font-semibold text-white/90">
            {formatLabel(match?.format ?? format)}
          </span>
          <span className="ml-auto flex items-center gap-1">
            <StatusPill state={state} />
            {onOpen && (
              <button
                onClick={onOpen}
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label={`Open court ${court.number} full screen`}
              >
                <Maximize2 className="size-4" />
              </button>
            )}
          </span>
        </header>

        {match ? (
          <div className={clsx('relative', full ? 'mt-6 [--stage:15rem] md:[--stage:22rem]' : 'mt-3 [--stage:9.75rem] sm:[--stage:11rem]')}>
            <TeamRow team="A" players={match.teamA} size={size} queued={queued} winner={match.result?.winner} score={match.result?.teamAScore} />
            <div className={full ? 'h-6' : 'h-2.5'} />
            <TeamRow team="B" players={match.teamB} size={size} queued={queued} winner={match.result?.winner} score={match.result?.teamBScore} />
            <VsMark full={full} />
          </div>
        ) : (
          <EmptyStage unavailable={state === 'Unavailable'} waitingCount={waitingCount} />
        )}

        {match?.isMixedSkill && <p className="relative mt-2 text-center text-xs text-white/50">Mixed-skill match — best available lineup</p>}
        {actions && <div className="relative mt-4">{actions}</div>}
      </article>
    </motion.div>
  )
}

function StatusPill({ state }: { state: State }) {
  if (state === 'Empty') return <span className="pill border-white/15 bg-ink/50 text-white/60">Open court</span>
  if (state === 'Unavailable')
    return (
      <span className="pill border-white/15 bg-ink/50 text-white/50">
        <CircleSlash className="size-4" /> Unavailable
      </span>
    )

  if (state === 'Playing' || state === 'Ready' || state === 'Completed')
    return (
      <span className="pill border-lime/70 bg-ink/60 font-display text-base text-lime">
        <span className="grid size-5 place-items-center rounded-full bg-lime text-ink">
          <Play className="ml-px size-3 fill-current" />
        </span>
        {matchStatusLabel[state]}
      </span>
    )
  if (state === 'PendingResult')
    return (
      <span className="pill border-grape/70 bg-ink/60 font-display text-base text-[#E2B8FF]">
        <Hourglass className="size-4" />
        {matchStatusLabel[state]}
      </span>
    )
  return (
    <span className="pill border-sky/70 bg-ink/60 font-display text-base text-sky">
      <Clock className="size-4.5" />
      {matchStatusLabel[state]}
    </span>
  )
}

function TeamRow({
  team,
  players,
  size,
  queued,
  winner,
  score,
}: {
  team: Team
  players: MatchPlayer[]
  size: Size
  queued: boolean
  winner?: Team
  score?: number
}) {
  const full = size === 'full'
  const lime = team === 'A'
  const won = winner === team

  return (
    <div className="grid grid-cols-[var(--stage)_minmax(0,1fr)] items-center gap-1.5">
      {/* Characters on a glowing ring */}
      <div className="relative flex h-full items-end justify-center">
        <div
          className={clsx(
            'absolute bottom-[2%] left-1/2 h-[30%] w-[94%] -translate-x-1/2 rounded-[50%] border-[2.5px]',
            lime
              ? 'border-lime bg-lime/15 shadow-[0_0_18px_1px_rgb(183_243_59/0.75),inset_0_0_14px_rgb(183_243_59/0.6)]'
              : 'border-grape bg-grape/20 shadow-[0_0_18px_1px_rgb(163_72_250/0.85),inset_0_0_14px_rgb(163_72_250/0.6)]',
          )}
        />
        <div className="relative z-10 flex">
          {players.map((p, i) => (
            <div key={p.player.userId} className={clsx('relative flex flex-col items-center', i > 0 && (full ? '-ml-8' : '-ml-5'))}>
              <PlayerAvatar
                player={p.player}
                flip={!lime}
                title={p.player.displayName}
                className={full ? 'w-[124px] md:w-[176px]' : 'w-[84px] sm:w-[96px]'}
              />
              {p.confirmation === 'Accepted' && queued && (
                <span className="absolute top-1 right-2 size-3 rounded-full bg-lime ring-2 ring-ink" title="Confirmed" />
              )}
              {full && (
                <span className="absolute -bottom-2 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold text-white/85">
                  Lv {p.player.characterLevel}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slanted name plate */}
      <div
        className={clsx(
          'relative min-w-0 rounded-2xl border bg-[#0A1220]/80 pr-3 pl-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] [clip-path:polygon(16px_0,100%_0,100%_100%,0_100%)]',
          lime ? 'border-lime/30' : 'border-grape/40',
          full ? 'py-4' : 'py-2',
        )}
      >
        <div className={clsx('font-display font-extrabold tracking-wide uppercase', full ? 'text-2xl' : 'text-[15px]')}>
          Team {team}
          {won && <Trophy className="ml-1.5 inline size-4 text-lime" />}
        </div>
        <div className={clsx('truncate text-white/85', full ? 'text-lg' : 'text-sm')}>
          {queued && 'Queued: '}
          {teamNames(players.map((p) => p.player.displayName))}
        </div>
        {score !== undefined && (
          <div
            className={clsx(
              'absolute top-1/2 right-3 -translate-y-1/2 font-display font-extrabold',
              full ? 'text-4xl' : 'text-2xl',
              won ? 'text-lime' : 'text-white/60',
            )}
          >
            {score}
          </div>
        )}
      </div>
    </div>
  )
}

/** Big glowing VS between the two teams, at the edge of the character stage. */
function VsMark({ full }: { full: boolean }) {
  return (
    <div className="pointer-events-none absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: 'calc(var(--stage) * 0.9)' }}>
      <span className={clsx('vs-text block leading-none', full ? 'text-7xl md:text-8xl' : 'text-[3rem] sm:text-[3.4rem]')}>VS</span>
    </div>
  )
}

function EmptyStage({ unavailable, waitingCount }: { unavailable: boolean; waitingCount?: number }) {
  return (
    <div className="relative flex h-[13.5rem] flex-col items-center justify-center gap-2 text-center">
      <span className="vs-text text-5xl opacity-30">VS</span>
      <p className="text-sm text-white/60">
        {unavailable
          ? 'This court is out of rotation.'
          : waitingCount !== undefined
            ? `${waitingCount} player${waitingCount === 1 ? '' : 's'} waiting`
            : 'Waiting for players'}
      </p>
    </div>
  )
}
