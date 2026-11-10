import { useQuery } from '@tanstack/react-query'
import { EyeOff, Trophy } from 'lucide-react'
import { Link } from 'react-router'
import { kudosApi } from '../api/api'
import { PageError } from '../components/ui/ErrorPage'
import { Spinner } from '../components/ui/primitives'
import { TopBar } from '../components/ui/TopBar'
import { KUDOS, kudosInfo } from '../lib/kudos'

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

/** My kudos: everything you've received, by kind and as a feed. Anonymous, and only you can see it. */
export function MyKudosPage() {
  const kudos = useQuery({ queryKey: ['kudos', 'mine'], queryFn: kudosApi.mine })
  if (!kudos.data) return kudos.error ? <PageError error={kudos.error} onRetry={() => kudos.refetch()} /> : <Spinner />
  const { total, byKind, recent } = kudos.data
  const byKindMap = new Map(byKind.map((k) => [k.kind, k]))

  return (
    <div className="mx-auto max-w-2xl">
      <TopBar back="/profile" title="My kudos" />

      <section className="card mb-5 flex items-center gap-4 p-5">
        <div>
          <div className="font-display text-5xl leading-none font-extrabold text-lime">{total}</div>
          <div className="mt-1 text-sm font-semibold text-muted">kudos received</div>
        </div>
        <p className="ml-auto flex max-w-48 items-start gap-2 text-xs text-muted">
          <EyeOff className="size-4 shrink-0" />
          Anonymous: you never see who gave them, and only you can see this page.
        </p>
      </section>

      <h2 className="mb-2 flex items-center justify-between px-1">
        <span className="font-display text-lg font-extrabold">By skill</span>
        <Link to="/street-cred" className="flex items-center gap-1 text-sm font-semibold text-lime">
          <Trophy className="size-4" /> Leaderboard
        </Link>
      </h2>
      <ul className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {KUDOS.map((k) => {
          const got = byKindMap.get(k.kind)
          const Icon = k.icon
          return (
            <li key={k.kind} className="card flex flex-col items-center p-3 text-center" style={got ? undefined : { opacity: 0.45 }}>
              <span className="grid size-9 place-items-center rounded-full" style={{ background: `${k.color}22`, color: k.color }}>
                <Icon className="size-4.5" />
              </span>
              <span className="mt-1.5 font-display text-2xl leading-none font-extrabold">{got?.received ?? 0}</span>
              <span className="mt-1 text-xs font-semibold">{k.label}</span>
              <span className="text-[10px] text-muted">{got ? `${got.cred} cred · ${got.givers} ${got.givers === 1 ? 'player' : 'players'}` : 'none yet'}</span>
            </li>
          )
        })}
      </ul>

      <h2 className="mb-2 px-1 font-display text-lg font-extrabold">Latest</h2>
      {recent.length === 0 ? (
        <p className="card px-6 py-8 text-center text-sm text-muted">No kudos yet. After a game, the players you played with can give you one.</p>
      ) : (
        <ul className="card divide-y divide-white/8">
          {recent.map((r, i) => {
            const k = kudosInfo(r.kind)
            const Icon = k.icon
            return (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: `${k.color}22`, color: k.color }}>
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    Someone gave you <span className="font-bold" style={{ color: k.color }}>{k.label}</span>
                  </div>
                  <div className="truncate text-xs text-muted">{r.sessionTitle}</div>
                </div>
                <span className="shrink-0 text-xs text-muted">{ago(r.givenAt)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
