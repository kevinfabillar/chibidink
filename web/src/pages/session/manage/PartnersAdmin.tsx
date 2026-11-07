import { Link2, Unlink } from 'lucide-react'
import { useState } from 'react'
import { sessionApi } from '../../../api/api'
import type { Participant, SessionDetail } from '../../../api/types'
import { PlayerAvatar } from '../../../components/character/Stage'
import { Button } from '../../../components/ui/Button'
import { ErrorNote, SectionTitle } from '../../../components/ui/primitives'
import { useSessionAction } from '../../../hooks/queries'

// text-base (16px) keeps iOS Safari from zooming the page when a select is tapped.
const selectCls = 'h-11 w-full min-w-0 rounded-xl border border-white/10 bg-ink px-3 text-base text-white focus:border-lime/70 focus:outline-none'

/** Organizer: fixed doubles partners. A pair always goes on court together, on the same team. */
export function PartnersAdmin({ session }: { session: SessionDetail }) {
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const setPartner = useSessionAction(session.id, ({ userId, partnerId }: { userId: string; partnerId: string | null }) =>
    sessionApi.setPartner(session.id, userId, partnerId),
  )

  const byId = new Map(session.participants.map((p) => [p.player.userId, p]))
  // Each pair once, ordered by the first player's place in the list.
  const pairs: [Participant, Participant][] = []
  for (const p of session.participants) {
    const partner = p.partnerId ? byId.get(p.partnerId) : undefined
    if (partner && !pairs.some(([a, b]) => a === partner || b === partner)) pairs.push([p, partner])
  }
  const options = session.participants.filter((p) => p.status !== 'Left')

  const option = (p: Participant) => {
    const current = p.partnerId ? byId.get(p.partnerId)?.player.displayName : undefined
    return (
      <option key={p.player.userId} value={p.player.userId}>
        {p.player.displayName}
        {current ? ` (with ${current})` : ''}
      </option>
    )
  }

  return (
    <section className="card p-5">
      <SectionTitle>Fixed partners</SectionTitle>
      <p className="mb-3 text-sm text-muted">
        Partners always play together on the same team. If one is still playing, the other waits for them. If one checks out, the other plays
        with anyone until they're back.
      </p>

      {pairs.length === 0 ? (
        <p className="mb-4 rounded-2xl bg-night/70 p-3 text-center text-sm text-muted">No fixed partners yet.</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {pairs.map(([a, b]) => (
            <li key={a.player.userId} className="flex items-center gap-2 rounded-2xl bg-night/70 p-2.5">
              <PairMember p={a} />
              <Link2 className="size-5 shrink-0 text-lime" aria-label="partnered with" />
              <PairMember p={b} />
              <Button
                size="sm"
                variant="dark"
                className="ml-auto shrink-0"
                icon={<Unlink className="size-4" />}
                loading={setPartner.isPending && setPartner.variables?.userId === a.player.userId}
                onClick={() => setPartner.mutate({ userId: a.player.userId, partnerId: null })}
              >
                Unpair
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-2xl border border-white/10 p-3">
        <div className="text-sm font-semibold">Add a pair</div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-muted">Player 1</span>
            <select value={first} onChange={(e) => setFirst(e.target.value)} className={selectCls}>
              <option value="" disabled>
                Choose…
              </option>
              {options.filter((p) => p.player.userId !== second).map(option)}
            </select>
          </label>
          <Link2 className="mb-3 size-5 text-white/50" aria-hidden />
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-muted">Player 2</span>
            <select value={second} onChange={(e) => setSecond(e.target.value)} className={selectCls}>
              <option value="" disabled>
                Choose…
              </option>
              {options.filter((p) => p.player.userId !== first).map(option)}
            </select>
          </label>
        </div>
        {[first, second].some((id) => id && byId.get(id)?.partnerId) && (
          <p className="text-xs text-amber-200">Someone you picked already has a partner. Pairing them here replaces that pair.</p>
        )}
        <Button
          block
          icon={<Link2 className="size-4.5" />}
          disabled={!first || !second || first === second}
          loading={setPartner.isPending && setPartner.variables?.userId === first}
          onClick={() =>
            setPartner.mutate(
              { userId: first, partnerId: second },
              {
                onSuccess: () => {
                  setFirst('')
                  setSecond('')
                },
              },
            )
          }
        >
          Pair them
        </Button>
      </div>
      <div className="mt-3">
        <ErrorNote error={setPartner.error} />
      </div>
    </section>
  )
}

function PairMember({ p }: { p: Participant }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <PlayerAvatar player={p.player} size={32} />
      <span className="truncate text-sm font-semibold">{p.player.displayName}</span>
    </div>
  )
}
