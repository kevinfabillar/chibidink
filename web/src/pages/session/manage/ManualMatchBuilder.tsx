import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { matchApi } from '../../../api/api'
import type { SessionDetail, Team } from '../../../api/types'
import { PlayerAvatar } from '../../../components/character/Stage'
import { Button } from '../../../components/ui/Button'
import { ErrorNote, SectionTitle, Segmented } from '../../../components/ui/primitives'
import { useSessionAction } from '../../../hooks/queries'

/** Organizer picks a court and hand-picks both teams. Tap a player to cycle: none → A → B. */
export function ManualMatchBuilder({ session }: { session: SessionDetail }) {
  const perTeam = 2 // doubles only
  const freeCourts = session.courts.filter((c) => c.status === 'Available' && !c.match)
  const available = session.participants.filter((p) => p.status === 'Waiting' || p.status === 'Paused')

  const [court, setCourt] = useState<number | null>(null)
  const [picks, setPicks] = useState<Record<string, Team>>({})
  const selectedCourt = court && freeCourts.some((c) => c.number === court) ? court : (freeCourts[0]?.number ?? null)

  const teamA = useMemo(() => Object.keys(picks).filter((id) => picks[id] === 'A'), [picks])
  const teamB = useMemo(() => Object.keys(picks).filter((id) => picks[id] === 'B'), [picks])

  const create = useSessionAction(session.id, () => matchApi.createManual(session.id, selectedCourt!, teamA, teamB))

  const cycle = (id: string) =>
    setPicks((p) => {
      const next = { ...p }
      if (!p[id] && teamA.length < perTeam) next[id] = 'A'
      else if ((!p[id] || p[id] === 'A') && teamB.length < perTeam) next[id] = 'B'
      else delete next[id]
      return next
    })

  if (freeCourts.length === 0)
    return (
      <section className="card p-5">
        <SectionTitle>Manual match</SectionTitle>
        <p className="text-sm text-muted">No free courts right now.</p>
      </section>
    )

  return (
    <section className="card space-y-4 p-5">
      <SectionTitle>Manual match</SectionTitle>
      <Segmented
        label="Court"
        value={selectedCourt ?? 0}
        onChange={setCourt}
        options={freeCourts.map((c) => ({ value: c.number, label: `Court ${c.number}` }))}
      />
      <p className="text-sm text-muted">
        Tap players to place them: first tap Team A, second Team B, third removes. Skipped players keep their queue spot.
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {available.map((p) => {
          const team = picks[p.player.userId]
          return (
            <li key={p.player.userId}>
              <button
                onClick={() => cycle(p.player.userId)}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-2xl border p-2 text-left transition',
                  team === 'A' && 'shadow-glow-lime border-transparent',
                  team === 'B' && 'shadow-glow-grape border-transparent',
                  !team && 'border-white/8 bg-night/70 hover:border-white/25',
                )}
                aria-pressed={!!team}
              >
                <PlayerAvatar player={p.player} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.player.displayName}</span>
                  <span className="text-xs text-muted">
                    {team ? `Team ${team}` : `${p.completedGames} games · skill ${p.skillEstimate}`}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <ErrorNote error={create.error} />
      <Button
        block
        disabled={teamA.length !== perTeam || teamB.length !== perTeam || !selectedCourt}
        loading={create.isPending}
        onClick={() => create.mutate(undefined, { onSuccess: () => setPicks({}) })}
      >
        Put on Court {selectedCourt}
      </Button>
    </section>
  )
}
