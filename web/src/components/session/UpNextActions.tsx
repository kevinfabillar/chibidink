import { Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { sessionApi } from '../../api/api'
import type { PlayerCard, SessionDetail, UpNextGroup } from '../../api/types'
import { LineupEditor, type PickSource } from '../court/LineupEditor'
import { useSessionAction } from '../../hooks/queries'
import { Button } from '../ui/Button'
import { ErrorNote } from '../ui/primitives'
import { Sheet } from '../ui/Sheet'

type Lineup = { teamA: string[]; teamB: string[] }

const ids = (g: UpNextGroup): Lineup => ({ teamA: g.teamA.map((p) => p.userId), teamB: g.teamB.map((p) => p.userId) })

/** Where each player is right now: on which court, or in which queued group. */
function whereabouts(session: SessionDetail) {
  const court = new Map<string, number>()
  for (const c of session.courts)
    for (const p of [...(c.match?.teamA ?? []), ...(c.match?.teamB ?? [])]) court.set(p.player.userId, c.number)
  const group = new Map<string, number>()
  for (const g of session.upNext) for (const p of [...g.teamA, ...g.teamB]) group.set(p.userId, g.order)
  return { court, group }
}

/** Organizer button under a queued group: change who's in it. The group goes onto the next free court as Ready. */
export function UpNextActions({ session, group }: { session: SessionDetail; group: UpNextGroup }) {
  const [editing, setEditing] = useState(false)
  const { court } = whereabouts(session)
  const onCourt = [...group.teamA, ...group.teamB].filter((p) => court.has(p.userId))

  return (
    <div className="mt-3 space-y-1.5">
      <Button size="md" pill block variant="dark" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
        Edit players
      </Button>
      {onCourt.length > 0 && (
        <p className="text-center text-xs text-muted">
          Waiting on {onCourt.map((p) => `${p.displayName} (court ${court.get(p.userId)})`).join(', ')}
        </p>
      )}
      {/* Keyed by the group's players so the draft starts fresh whenever the group changes. */}
      <EditGroupSheet
        key={[...ids(group).teamA, ...ids(group).teamB].join()}
        open={editing}
        onClose={() => setEditing(false)}
        session={session}
        group={group}
      />
    </div>
  )
}

/**
 * Pick the four players for a queued group: anyone on the waitlist, in another group (they trade places),
 * or on court right now (the group then waits for their game to end). Saving lines the groups up to this
 * one by hand, so the matchmaker keeps them as set.
 */
function EditGroupSheet({ open, onClose, session, group }: { open: boolean; onClose: () => void; session: SessionDetail; group: UpNextGroup }) {
  const perTeam = group.teamA.length
  const original = [...ids(group).teamA, ...ids(group).teamB]
  const { court, group: groupOf } = whereabouts(session)

  const people = new Map<string, PlayerCard>(session.participants.map((p) => [p.player.userId, p.player]))
  const sources: PickSource[] = [
    {
      label: 'Waitlist',
      ids: session.participants.filter((p) => p.status === 'Waiting' && !groupOf.has(p.player.userId)).map((p) => p.player.userId),
    },
    {
      label: 'In other groups (they trade places)',
      ids: session.participants.filter((p) => (groupOf.get(p.player.userId) ?? group.order) !== group.order).map((p) => p.player.userId),
      tag: (id) => `Group ${groupOf.get(id)}`,
    },
    {
      label: 'On court now (this group waits for them)',
      ids: session.participants.filter((p) => p.status === 'InMatch').map((p) => p.player.userId),
      tag: (id) => `Court ${court.get(id)}`,
    },
  ]

  const save = useSessionAction(session.id, (draft: string[]) => sessionApi.setPlannedGroups(session.id, plannedWith(session, group, draft, perTeam)))
  const reset = useSessionAction(session.id, () => sessionApi.setPlannedGroups(session.id, []))
  const anyPlanned = session.upNext.some((g) => g.isPlanned)

  return (
    <Sheet open={open} onClose={onClose} title={group.order === 1 ? 'Edit next group' : `Edit group ${group.order}`}>
      <div className="space-y-4">
        <LineupEditor
          title="Next game"
          original={original}
          perTeam={perTeam}
          people={people}
          sources={sources}
          partnerOf={new Map(session.participants.filter((p) => p.partnerId).map((p) => [p.player.userId, p.partnerId!]))}
          saving={save.isPending}
          saveLabel="Save group"
          onSave={(a, b) => save.mutate([...a, ...b], { onSuccess: onClose })}
          onCancel={onClose}
          note={(lineup) => {
            const busy = lineup.filter((id) => court.has(id))
            return busy.length > 0 ? (
              <p className="mt-2 text-center text-xs text-muted">
                Waits for {busy.map((id) => people.get(id)?.displayName).join(', ')} to finish their game.
              </p>
            ) : null
          }}
        />
        {anyPlanned && (
          <Button block variant="ghost" icon={<RotateCcw className="size-4" />} loading={reset.isPending} onClick={() => reset.mutate(undefined, { onSuccess: onClose })}>
            Reset queue to automatic
          </Button>
        )}
        <ErrorNote error={save.error ?? reset.error} />
      </div>
    </Sheet>
  )
}

/**
 * The full list of lined-up groups after this edit. Groups up to the edited one are kept in the order shown,
 * so nothing ahead of it jumps around; anyone pulled in from another of those groups trades places.
 */
function plannedWith(session: SessionDetail, edited: UpNextGroup, draft: string[], perTeam: number): Lineup[] {
  const lastPlanned = session.upNext.reduce((n, g) => (g.isPlanned ? g.order : n), 0)
  const through = Math.max(edited.order, lastPlanned)
  const groups = session.upNext.filter((g) => g.order <= through).map((g) => [...ids(g).teamA, ...ids(g).teamB])
  const editedIndex = edited.order - 1
  const before = groups[editedIndex]

  draft.forEach((incoming, slot) => {
    const outgoing = before[slot]
    if (incoming === outgoing) return
    groups.forEach((g, gi) => {
      if (gi === editedIndex) return
      const at = g.indexOf(incoming)
      // Trade places, unless the outgoing player is also staying in the edited group.
      if (at >= 0) g[at] = draft.includes(outgoing) ? g[at] : outgoing
    })
  })
  groups[editedIndex] = draft

  // A group that lost someone without a trade can't be kept; it goes back to the matchmaker.
  return groups
    .filter((g, gi) => gi === editedIndex || !g.some((id, i) => i !== g.indexOf(id) || (draft.includes(id) && gi !== editedIndex)))
    .map((g) => ({ teamA: g.slice(0, perTeam), teamB: g.slice(perTeam) }))
}
