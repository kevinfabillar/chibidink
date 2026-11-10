import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router'
import { kudosApi } from '../api/api'
import type { KudosKind } from '../api/types'
import { PlayerName } from '../components/character/NameTag'
import { PlayerAvatar } from '../components/character/Stage'
import { PageError } from '../components/ui/ErrorPage'
import { Spinner } from '../components/ui/primitives'
import { TopBar } from '../components/ui/TopBar'
import { useMe } from '../hooks/queries'
import { KUDOS, kudosInfo } from '../lib/kudos'

/** Street Cred leaderboard: the top players for each skill and quality, built from kudos. */
export function StreetCredPage() {
  const [kind, setKind] = useState<KudosKind>('Dinks')
  const meId = useMe().data?.player.userId
  const board = useQuery({ queryKey: ['street-cred', kind], queryFn: () => kudosApi.leaderboard(kind) })
  const info = kudosInfo(kind)
  const Icon = info.icon

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar back="/profile" title="Street Cred" sub="Kudos received × the number of different players who gave them. Many fans beat one friend." />

      {/* Kinds as icon tabs: skills, then character. */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="tablist">
        {KUDOS.map((k) => {
          const on = k.kind === kind
          const KIcon = k.icon
          return (
            <button
              key={k.kind}
              role="tab"
              aria-selected={on}
              onClick={() => setKind(k.kind)}
              className={clsx(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition',
                on ? '!text-[#0b0f17]' : 'border-white/12 bg-surface/80 text-white/80 hover:border-white/30',
              )}
              style={on ? { background: k.color, borderColor: k.color } : undefined}
            >
              <KIcon className="size-4" style={on ? undefined : { color: k.color }} />
              {k.label}
            </button>
          )
        })}
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm text-muted">
        <Icon className="size-4" style={{ color: info.color }} />
        {info.hint}
      </div>

      {board.error ? (
        <PageError error={board.error} onRetry={() => board.refetch()} />
      ) : !board.data ? (
        <Spinner />
      ) : board.data.length === 0 ? (
        <p className="card px-6 py-10 text-center text-sm text-muted">No one has {info.label.toLowerCase()} kudos yet. Give some after your next game!</p>
      ) : (
        <ol className="card divide-y divide-white/8">
          {board.data.map((e) => (
            <li key={e.player.userId} className={clsx('flex items-center gap-3 px-3 py-2.5', e.player.userId === meId && 'bg-lime/10')}>
              <span
                className={clsx(
                  'w-8 shrink-0 text-center font-display text-xl font-extrabold',
                  e.rank === 1 ? 'text-[#F5B700]' : e.rank === 2 ? 'text-[#A8B3C4]' : e.rank === 3 ? 'text-[#D9822B]' : 'text-muted',
                )}
              >
                {e.rank}
              </span>
              <PlayerAvatar player={e.player} size={40} />
              <Link to={`/players/${e.player.userId}`} className="min-w-0 flex-1">
                <span className="flex py-1">
                  <PlayerName player={e.player} className="truncate font-semibold" truncate />
                </span>
                <span className="block text-xs text-muted">
                  {e.received} kudos from {e.givers} {e.givers === 1 ? 'player' : 'players'}
                </span>
              </Link>
              <span className="shrink-0 text-right">
                <span className="block font-display text-xl leading-none font-extrabold" style={{ color: info.color }}>
                  {e.cred}
                </span>
                <span className="text-[10px] font-bold tracking-wider text-muted uppercase">crd</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
