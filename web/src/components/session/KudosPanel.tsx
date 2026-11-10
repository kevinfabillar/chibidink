import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check, ChevronRight, Lock, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { kudosApi } from '../../api/api'
import type { KudosCount, KudosKind, KudosTarget, SessionKudos, StreetCred } from '../../api/types'
import { queryKeys } from '../../hooks/queries'
import { KUDOS, kudosInfo, type KudosInfo } from '../../lib/kudos'
import { PlayerName } from '../character/NameTag'
import { PlayerAvatar } from '../character/Stage'
import { Button } from '../ui/Button'
import { ErrorNote, SectionTitle } from '../ui/primitives'
import { Sheet } from '../ui/Sheet'

/**
 * My Games: one kudos for each person you played with this session (newest game first), and the kudos
 * you got here. One per person per session: tap another to switch, tap yours again to take it back.
 */
export function KudosPanel({ sessionId }: { sessionId: string }) {
  const kudos = useQuery({ queryKey: queryKeys.kudos(sessionId), queryFn: () => kudosApi.forSession(sessionId) })
  const data = kudos.data
  const ready = !!data
  // Arriving from the bell or the home banner (...#kudos): scroll to the kudos once they've loaded.
  useEffect(() => {
    if (ready && location.hash === '#kudos') document.getElementById('kudos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [ready])
  if (!data) return null
  const board = data.board ?? []
  const total = board.reduce((n, g) => n + g.players.reduce((m, p) => m + p.count, 0), 0)

  return (
    <section id="kudos" className="scroll-mt-4">
      <SectionTitle action={total > 0 ? <span className="text-sm font-semibold text-muted">{total} given</span> : undefined}>Kudos this session</SectionTitle>
      {board.length === 0 ? (
        <p className="card px-5 py-6 text-center text-sm text-muted">No kudos yet. After a game, give the players you played with a kudos for what they did best.</p>
      ) : (
        <div className="card space-y-5 p-4">
          {/* Only kinds someone actually received, and only the players who got them. Givers stay anonymous. */}
          {board.map((g) => {
            const info = kudosInfo(g.kind)
            const Icon = info.icon
            return (
              <div key={g.kind}>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold" style={{ color: info.color }}>
                  <Icon className="size-4" />
                  {info.label}
                  <span className="text-xs font-semibold text-muted">· {g.players.length}</span>
                </h3>
                <ul className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5">
                  {g.players.map(({ player, count }) => (
                    <li key={player.userId} className="flex flex-col items-center">
                      <span className="relative grid size-14 place-items-center rounded-full" style={{ boxShadow: `0 0 0 2.5px ${info.color}` }}>
                        <span className="grid size-full place-items-center overflow-hidden rounded-full bg-night">
                          <PlayerAvatar player={player} size={56} />
                        </span>
                        {count > 1 && (
                          <span className="absolute -right-1.5 -bottom-1 rounded-full border-2 border-surface px-1.5 text-[11px] font-extrabold !text-[#0b0f17]" style={{ background: info.color }}>
                            x{count}
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 flex max-w-full justify-center px-0.5">
                        <PlayerName player={player} className="truncate text-xs font-semibold" truncate />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          <p className="text-center text-[11px] text-muted">Kudos are anonymous: you see who got them, never who gave them.</p>
        </div>
      )}
      {data.received.length > 0 && (
        <div className="card mt-3 flex flex-wrap items-center gap-2 p-3">
          <span className="mr-1 text-sm font-semibold text-muted">Kudos you got</span>
          <KudosBadges counts={data.received} />
          <Link to="/kudos" className="ml-auto text-sm font-semibold text-lime">
            All my kudos ›
          </Link>
        </div>
      )}
    </section>
  )
}

/** Gives, switches or takes back this player's one kudos for the session (shown right away). */
function useToggleKudos(sessionId: string, target: KudosTarget) {
  const queryClient = useQueryClient()
  const key = queryKeys.kudos(sessionId)
  return useMutation({
    mutationFn: (kind: KudosKind) => kudosApi.toggle(sessionId, target.matchId, target.player.userId, kind),
    onMutate: (kind) => {
      queryClient.setQueryData<SessionKudos>(key, (old) =>
        old && {
          ...old,
          players: old.players.map((p) => (p.player.userId !== target.player.userId ? p : { ...p, given: p.given === kind ? null : kind })),
        },
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me }) // the bell / home prompt
    },
  })
}

/**
 * The players grouped by the kudos you gave them: one heading per kudos that was given (nothing for kinds
 * nobody got), players still waiting first. Once everyone has one, Confirm makes them final.
 */
function KudosGrid({ sessionId, players }: { sessionId: string; players: KudosTarget[] }) {
  const queryClient = useQueryClient()
  const confirm = useMutation({
    mutationFn: () => kudosApi.confirm(sessionId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.kudos(sessionId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me })
    },
  })
  const unconfirmed = players.some((p) => p.given && !p.locked)
  const anyConfirmed = players.some((p) => p.locked)

  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-4">
        {players.map((p) => (
          <PlayerKudos key={p.player.userId} sessionId={sessionId} target={p} />
        ))}
      </ul>
      {unconfirmed ? (
        <div>
          <Button block icon={<Check className="size-5" />} loading={confirm.isPending} onClick={() => confirm.mutate()}>
            Confirm kudos
          </Button>
          <p className="mt-1.5 text-center text-xs text-muted">You don't have to give everyone one. Once confirmed, your kudos can't be changed.</p>
          <ErrorNote error={confirm.error} />
        </div>
      ) : (
        anyConfirmed && (
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-lime">
            <Lock className="size-4" /> Kudos confirmed. Thanks for the love!
          </p>
        )
      )}
    </div>
  )
}

/** One player as a round profile picture: tap it to choose their kudos; what you gave shows under the name. */
function PlayerKudos({ sessionId, target }: { sessionId: string; target: KudosTarget }) {
  const [open, setOpen] = useState(false)
  const given = target.given ? kudosInfo(target.given) : null
  const GivenIcon = given?.icon
  const ring = given ? given.color : target.closed ? '#4B5563' : '#B7F33B'
  const final = target.locked || target.closed
  return (
    <li className="flex flex-col items-center">
      <button
        onClick={() => !final && setOpen(true)}
        disabled={final}
        aria-label={target.locked ? `${target.player.displayName}: kudos confirmed` : target.closed ? `${target.player.displayName}: skipped` : `Give ${target.player.displayName} kudos`}
        className={clsx('group relative grid size-18 place-items-center rounded-full transition active:scale-95', target.closed && 'opacity-50')}
        style={{ boxShadow: `0 0 0 3px ${ring}, 0 0 18px -4px ${ring}` }}
      >
        <span className="grid size-full place-items-center overflow-hidden rounded-full bg-night">
          <PlayerAvatar player={target.player} size={72} />
        </span>
        {given && GivenIcon && (
          <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border-2 border-surface !text-[#0b0f17]" style={{ background: given.color }}>
            <GivenIcon className="size-4" />
          </span>
        )}
      </button>
      <div className="mt-2 flex max-w-full justify-center px-1">
        <PlayerName player={target.player} className="truncate text-sm font-semibold" truncate />
      </div>
      <div className="text-[11px] text-muted">{target.teammate ? 'Teammate' : 'Opponent'}</div>
      {given ? (
        <span className="mt-1 flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-bold !text-[#0b0f17]" style={{ background: given.color }}>
          {target.locked && <Lock className="size-3" />}
          {given.label}
        </span>
      ) : target.closed ? (
        <span className="mt-1 rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-bold text-muted">Skipped</span>
      ) : (
        <span className="mt-1 rounded-full bg-lime/15 px-2 py-0.5 text-[11px] font-bold text-lime">Give</span>
      )}
      {!final && <KudosPicker open={open} onClose={() => setOpen(false)} sessionId={sessionId} target={target} />}
    </li>
  )
}

/** The kudos choices for one player, as a sheet: tap one to give it (tap yours again to take it back). */
function KudosPicker({ open, onClose, sessionId, target }: { open: boolean; onClose: () => void; sessionId: string; target: KudosTarget }) {
  const toggle = useToggleKudos(sessionId, target)
  // Close right away (the row updates instantly); if the server refuses, the row goes back and shows why.
  const pick = (k: KudosInfo) => {
    toggle.mutate(k.kind)
    onClose()
  }
  const option = (k: KudosInfo) => {
    const on = target.given === k.kind
    const Icon = k.icon
    return (
      <button
        key={k.kind}
        onClick={() => pick(k)}
        disabled={toggle.isPending}
        aria-pressed={on}
        className={clsx('flex items-start gap-2.5 rounded-2xl border p-2.5 text-left transition', on ? 'border-transparent' : 'border-white/10 bg-night/50 hover:border-white/30')}
        style={on ? { background: `${k.color}26`, borderColor: k.color, boxShadow: `0 0 18px -8px ${k.color}` } : undefined}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: on ? k.color : `${k.color}22`, color: on ? '#0b0f17' : k.color }}>
          <Icon className="size-4.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold">{k.label}</span>
          <span className="block text-[11px] leading-snug text-muted">{k.hint}</span>
        </span>
      </button>
    )
  }
  return (
    <Sheet open={open} onClose={onClose} title="Give kudos">
      <div className="mb-4 flex items-center gap-3">
        <PlayerAvatar player={target.player} size={52} />
        <div className="min-w-0">
          <div className="flex py-0.5">
            <PlayerName player={target.player} size="md" className="truncate font-display text-lg font-extrabold" truncate />
          </div>
          <div className="text-xs text-muted">
            {target.teammate ? 'Your teammate' : 'Your opponent'} on Court {target.courtNumber} · one kudos for this session
          </div>
        </div>
      </div>
      <div className="mb-1.5 text-[11px] font-bold tracking-[0.16em] text-muted uppercase">Skills</div>
      <div className="mb-4 grid grid-cols-2 gap-2">{KUDOS.filter((k) => k.group === 'skill').map(option)}</div>
      <div className="mb-1.5 text-[11px] font-bold tracking-[0.16em] text-muted uppercase">Character</div>
      <div className="grid grid-cols-2 gap-2">{KUDOS.filter((k) => k.group === 'character').map(option)}</div>
      {target.given && <p className="mt-3 text-center text-xs text-muted">Tap your kudos again to take it back.</p>}
      <ErrorNote error={toggle.error} />
    </Sheet>
  )
}

/** Kudos counts as small colored badges (kudos you got this session). */
export function KudosBadges({ counts, className }: { counts: KudosCount[]; className?: string }) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-1.5', className)}>
      {counts.map(({ kind, count }) => {
        const { label, icon: Icon, color } = kudosInfo(kind)
        return (
          <span
            key={kind}
            title={`${label}: ${count}`}
            className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm font-bold"
            style={{ borderColor: `${color}99`, background: `${color}1f` }}
          >
            <Icon className="size-4" style={{ color }} />
            {count}
            <span className="sr-only">{label}</span>
          </span>
        )
      })}
    </div>
  )
}

/** Profile: a player's best Street Cred, right under their level. */
export function StreetCredRow({ cred }: { cred: StreetCred[] }) {
  const top = cred.slice(0, 3)
  return (
    <Link to="/street-cred" className="mt-3 block w-full rounded-2xl border border-white/10 bg-night/50 p-2.5 transition hover:border-lime/50">
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
        Street Cred
        <ChevronRight className="size-4" />
      </div>
      {top.length === 0 ? (
        <p className="text-center text-xs text-muted">No kudos yet. Play a game and they'll start coming in.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {top.map(({ kind, cred: score, givers }) => {
            const { label, icon: Icon, color } = kudosInfo(kind)
            return (
              <div key={kind} className="flex flex-col items-center rounded-xl py-1.5" style={{ background: `${color}1a` }} title={`${givers} players gave this`}>
                <Icon className="size-5" style={{ color }} />
                <span className="mt-0.5 font-display text-lg leading-none font-extrabold">{score}</span>
                <span className="mt-0.5 max-w-full truncate px-1 text-[10px] font-semibold text-muted">{label}</span>
              </div>
            )
          })}
        </div>
      )}
    </Link>
  )
}

/**
 * Session page: a clear "Give kudos" button while someone you played with this session still has no kudos
 * from you. Opens the same list in a sheet.
 */
export function GiveKudosButton({ sessionId }: { sessionId: string }) {
  const kudos = useQuery({ queryKey: queryKeys.kudos(sessionId), queryFn: () => kudosApi.forSession(sessionId) })
  const [open, setOpen] = useState(false)
  const players = kudos.data?.players ?? []
  const toConfirm = players.some((p) => p.given && !p.locked)
  // Players you can still give one to: no kudos yet, and not from a game you've already confirmed.
  const canGive = players.some((p) => !p.given && !p.closed)
  // Shown while there's something to confirm or someone you can still give a kudos (nobody has to give everyone one).
  if (!toConfirm && !canGive && !open) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-lime/50 bg-gradient-to-r from-lime/15 via-surface/70 to-surface/70 p-3 text-left transition hover:border-lime"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime text-[#0b0f17]">
          <Sparkles className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg leading-tight font-extrabold">{toConfirm ? 'Confirm your kudos' : 'Give kudos'}</span>
          <span className="block text-xs text-white/80">
            {toConfirm
              ? 'Confirm the kudos you gave to make them final.'
              : `Give kudos to the ${players.length} ${players.length === 1 ? 'player' : 'players'} you played with`}
          </span>
        </span>
        <ChevronRight className="size-6 shrink-0 text-lime" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Give kudos">
        <p className="-mt-1 mb-3 text-sm text-muted">One kudos for each player, for what they did best. It builds their Street Cred.</p>
        <div className="rounded-2xl border border-white/10 p-4">
          <KudosGrid sessionId={sessionId} players={players} />
        </div>
        <Button block className="mt-4" onClick={() => setOpen(false)}>
          Done
        </Button>
      </Sheet>
    </>
  )
}
