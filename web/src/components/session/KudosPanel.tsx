import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { ChevronRight, Sparkles } from 'lucide-react'
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
  // Arriving from the bell or the home banner (…#kudos): scroll to the kudos once they've loaded.
  useEffect(() => {
    if (ready && location.hash === '#kudos') document.getElementById('kudos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [ready])
  if (!data || (data.players.length === 0 && data.received.length === 0)) return null
  const done = data.players.filter((p) => p.given).length

  return (
    <section id="kudos" className="scroll-mt-4">
      {data.players.length > 0 && (
        <>
          <SectionTitle action={<span className={clsx('text-sm font-semibold', done === data.players.length ? 'text-lime' : 'text-muted')}>{done}/{data.players.length} given</span>}>
            Kudos
          </SectionTitle>
          <p className="-mt-1 mb-3 text-sm text-muted">One kudos for each player you played with this session, for what they did best. It builds their Street Cred.</p>
          <ul className="card divide-y divide-white/8">
            {data.players.map((p) => (
              <PlayerKudos key={p.player.userId} sessionId={sessionId} target={p} />
            ))}
          </ul>
        </>
      )}
      {data.received.length > 0 && (
        <div className={clsx('card flex flex-wrap items-center gap-2 p-3', data.players.length > 0 && 'mt-3')}>
          <span className="mr-1 text-sm font-semibold text-muted">Kudos you got</span>
          <KudosBadges counts={data.received} />
        </div>
      )}
    </section>
  )
}

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`
}

/** One player: who they are and the one kudos to give them (tap another to switch, tap again to take back). */
function PlayerKudos({ sessionId, target }: { sessionId: string; target: KudosTarget }) {
  const queryClient = useQueryClient()
  const key = queryKeys.kudos(sessionId)
  const [hint, setHint] = useState<KudosInfo | null>(null)
  const toggle = useMutation({
    mutationFn: (kind: KudosKind) => kudosApi.toggle(sessionId, target.matchId, target.player.userId, kind),
    // Show the change right away; the server's answer replaces it a moment later.
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

  const chip = (k: KudosInfo) => {
    const on = target.given === k.kind
    const Icon = k.icon
    return (
      <button
        key={k.kind}
        onClick={() => {
          setHint(on ? null : k)
          toggle.mutate(k.kind)
        }}
        aria-pressed={on}
        className={clsx(
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition',
          on ? '!text-[#0b0f17]' : 'border-white/12 bg-night/60 text-white/80 hover:border-white/30',
          target.given && !on && 'opacity-60',
        )}
        style={on ? { background: k.color, borderColor: k.color, boxShadow: `0 0 14px -4px ${k.color}` } : undefined}
      >
        <Icon className="size-4" style={on ? undefined : { color: k.color }} />
        {k.label}
      </button>
    )
  }

  return (
    <li className="p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <PlayerAvatar player={target.player} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex py-0.5">
            <PlayerName player={target.player} className="truncate font-semibold" truncate />
          </div>
          <div className="text-xs text-muted">
            {target.teammate ? 'Teammate' : 'Opponent'} · Court {target.courtNumber} · {ago(target.playedAt)}
          </div>
        </div>
        {target.given && <span className="shrink-0 text-xs font-semibold text-lime">Given</span>}
      </div>
      <div className="mb-1 text-[11px] font-bold tracking-[0.16em] text-muted uppercase">Skills</div>
      <div className="mb-2.5 flex flex-wrap gap-1.5">{KUDOS.filter((k) => k.group === 'skill').map(chip)}</div>
      <div className="mb-1 text-[11px] font-bold tracking-[0.16em] text-muted uppercase">Character</div>
      <div className="flex flex-wrap gap-1.5">{KUDOS.filter((k) => k.group === 'character').map(chip)}</div>
      {hint && (
        <p className="mt-2 text-xs text-muted">
          {hint.label}: {hint.hint}
        </p>
      )}
      <ErrorNote error={toggle.error} />
    </li>
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
  const waiting = players.filter((p) => !p.given).length
  if (players.length === 0 || (waiting === 0 && !open)) return null

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
          <span className="block font-display text-lg leading-tight font-extrabold">Give kudos</span>
          <span className="block text-xs text-white/80">
            {waiting} {waiting === 1 ? 'player' : 'players'} you played with {waiting === 1 ? 'is' : 'are'} waiting for your kudos
          </span>
        </span>
        <ChevronRight className="size-6 shrink-0 text-lime" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Give kudos">
        <p className="-mt-1 mb-3 text-sm text-muted">One kudos for each player, for what they did best. It builds their Street Cred.</p>
        <ul className="divide-y divide-white/8 rounded-2xl border border-white/10">
          {players.map((p) => (
            <PlayerKudos key={p.player.userId} sessionId={sessionId} target={p} />
          ))}
        </ul>
        <Button block className="mt-4" onClick={() => setOpen(false)}>
          Done
        </Button>
      </Sheet>
    </>
  )
}
