import { useState } from 'react'
import { sessionApi } from '../../../api/api'
import type { SessionDetail } from '../../../api/types'
import { PlayerAvatar } from '../../../components/character/Stage'
import { Button } from '../../../components/ui/Button'
import { ErrorNote, SectionTitle, Segmented, Toggle } from '../../../components/ui/primitives'
import { useSessionAction } from '../../../hooks/queries'
import { SKILL_TIERS, tierOf } from '../../../lib/skill'

const statusText = { Waiting: 'Checked in', InMatch: 'On court', Paused: 'Checked out', Left: 'Left' }

/** Add someone who has no phone: just a name (and level). They're checked in straight away. */
function AddPlayer({ session }: { session: SessionDetail }) {
  const [name, setName] = useState('')
  const [skill, setSkill] = useState<number>(2)
  const add = useSessionAction(session.id, () => sessionApi.addPlayer(session.id, name.trim(), skill))

  return (
    <form
      className="mb-4 space-y-2.5 rounded-2xl bg-night/70 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) add.mutate(undefined, { onSuccess: () => setName('') })
      }}
    >
      <div className="text-sm font-semibold">Add a player without a phone</div>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Name"
          aria-label="New player's name"
          className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-ink px-3 text-sm text-white placeholder:text-white/30 focus:border-lime/70 focus:outline-none"
        />
        <Button type="submit" disabled={!name.trim()} loading={add.isPending}>
          Add &amp; check in
        </Button>
      </div>
      {session.settings.mode === 'SkillBased' && (
        <Segmented label="New player's level" value={skill} onChange={setSkill} options={SKILL_TIERS.map((t) => ({ value: t.value as number, label: t.label }))} />
      )}
      <ErrorNote error={add.error} />
    </form>
  )
}

/** Each player's level (used by Skill Based queues) and check-in. */
export function PlayersAdmin({ session }: { session: SessionDetail }) {
  const setSkill = useSessionAction(session.id, ({ userId, skill }: { userId: string; skill: number }) =>
    sessionApi.setSkill(session.id, userId, skill),
  )
  const setQueued = useSessionAction(session.id, ({ userId, queued }: { userId: string; queued: boolean }) =>
    sessionApi.setQueued(session.id, userId, queued),
  )

  return (
    <section className="card p-5">
      <SectionTitle>Players ({session.participants.length})</SectionTitle>
      {session.status !== 'Closed' && <AddPlayer session={session} />}
      <p className="mb-3 text-sm text-muted">Set each player's level for Skill Based queues. The switch checks a player in or out.</p>
      <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {session.participants.map((p) => (
          <li key={p.player.userId} className="flex items-center gap-3 rounded-2xl bg-night/70 p-2.5">
            <PlayerAvatar player={p.player} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{p.player.displayName}</div>
              <div className="text-xs text-muted">
                {statusText[p.status]} · {p.completedGames} games
              </div>
            </div>
            <select
              value={tierOf(p.skillEstimate)}
              onChange={(e) => setSkill.mutate({ userId: p.player.userId, skill: Number(e.target.value) })}
              className="h-9 rounded-xl border border-white/10 bg-ink px-2 text-sm"
              aria-label={`${p.player.displayName} skill`}
            >
              {SKILL_TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {p.status !== 'InMatch' && (
              <Toggle
                label={`${p.player.displayName} checked in`}
                checked={p.status === 'Waiting'}
                onChange={(queued) => setQueued.mutate({ userId: p.player.userId, queued })}
              />
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <ErrorNote error={setSkill.error ?? setQueued.error} />
      </div>
    </section>
  )
}
