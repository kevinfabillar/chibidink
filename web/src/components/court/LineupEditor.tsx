import clsx from 'clsx'
import { ArrowDownUp, Check, GripVertical, Hand, Link2, Minus, Plus, Users } from 'lucide-react'
import { motion, useDragControls } from 'motion/react'
import { useState, type ReactNode } from 'react'
import type { PlayerCard } from '../../api/types'
import { PlayerAvatar } from '../character/Stage'
import { Button } from '../ui/Button'

/** A panel of people who can be brought in (waitlist, another court, another group). */
export interface PickSource {
  label: string
  ids: string[]
  /** Small tag on each card, e.g. "Court 2". */
  tag?: (id: string) => string | undefined
}

interface Props {
  title: string
  /** Team A spots, then Team B spots. */
  original: string[]
  perTeam: number
  people: Map<string, PlayerCard>
  sources: PickSource[]
  saving?: boolean
  saveLabel?: string
  onSave: (teamA: string[], teamB: string[]) => void
  onCancel: () => void
  /** Extra line under the court, e.g. why a group has to wait. */
  note?: (lineup: string[]) => ReactNode
  /** Fixed partners (userId -> partner's userId), to warn when an edit splits a pair. */
  partnerOf?: Map<string, string>
}

type Pick = { kind: 'slot'; slot: number } | { kind: 'pool'; id: string } | null
type Lineup = (string | null)[]

/**
 * Visual player editor: the court (Team A vs Team B) on top, everyone who can come in below.
 * Tap one player then another to swap them, use − / + to take players off and put them on, or drag
 * a card by its grip onto another. Works the same with a mouse and with touch (Chrome and Safari).
 */
export function LineupEditor({ title, original, perTeam, people, sources, saving, saveLabel = 'Save changes', onSave, onCancel, note, partnerOf }: Props) {
  const [lineup, setLineup] = useState<Lineup>(original)
  const [picked, setPicked] = useState<Pick>(null)

  const onCourt = new Set(lineup.filter(Boolean) as string[])
  const full = lineup.every(Boolean)
  const changed = lineup.some((id, i) => id !== original[i])
  // Taken off in this edit: shown first under Waiting so they can be put back.
  const removed = original.filter((id) => !onCourt.has(id))
  const pools = [
    { label: 'Waiting', ids: [...removed, ...(sources[0]?.ids ?? []).filter((id) => !removed.includes(id))], tag: (id: string) => (removed.includes(id) ? 'Taken off' : sources[0]?.tag?.(id)) },
    ...sources.slice(1),
  ].map((s) => ({ ...s, ids: s.ids.filter((id) => !onCourt.has(id) && people.has(id)) }))
  const waitingCount = pools.reduce((n, p) => n + p.ids.length, 0)

  // Pairs this lineup splits: on court without their partner, or on opposite sides.
  const sideOf = (id: string) => (lineup.indexOf(id) < perTeam ? 'A' : 'B')
  const split = [...onCourt].filter((id) => {
    const partner = partnerOf?.get(id)
    if (!partner) return false
    if (!onCourt.has(partner)) return true // partner left off court
    return id < partner && sideOf(partner) !== sideOf(id) // both on, opposite sides (count the pair once)
  })

  /** Put a player in a spot. If they're already on court, the two trade spots. */
  const place = (id: string, slot: number) =>
    setLineup((l) => {
      const next = [...l]
      const from = next.indexOf(id)
      if (from >= 0) next[from] = next[slot]
      next[slot] = id
      return next
    })
  const removeAt = (slot: number) => setLineup((l) => l.map((id, i) => (i === slot ? null : id)))
  const add = (id: string) => {
    const empty = lineup.indexOf(null)
    if (empty >= 0) place(id, empty)
    else setPicked({ kind: 'pool', id }) // court is full: tap who they replace
  }

  const tapSlot = (slot: number) => {
    if (picked?.kind === 'pool') {
      place(picked.id, slot)
      setPicked(null)
    } else if (picked?.kind === 'slot') {
      if (picked.slot !== slot) {
        const id = lineup[picked.slot]
        if (id) place(id, slot)
      }
      setPicked(null)
    } else if (lineup[slot]) setPicked({ kind: 'slot', slot })
  }
  const tapPool = (id: string) => {
    if (picked?.kind === 'slot') {
      place(id, picked.slot)
      setPicked(null)
    } else setPicked(picked?.kind === 'pool' && picked.id === id ? null : { kind: 'pool', id })
  }

  /** Drag-and-drop: find what's under the finger/pointer (ignoring the card being dragged). */
  const drop = (from: { slot?: number; id?: string }, x: number, y: number) => {
    const target = document
      .elementsFromPoint(x, y)
      .map((el) => (el as HTMLElement).closest<HTMLElement>('[data-drop]'))
      .find((el) => el && el.dataset.drop !== (from.slot !== undefined ? `slot:${from.slot}` : `id:${from.id}`))
    const key = target?.dataset.drop
    setPicked(null)
    if (!key) return
    if (key.startsWith('slot:')) {
      const slot = Number(key.slice(5))
      const id = from.id ?? (from.slot !== undefined ? lineup[from.slot] : null)
      if (id) place(id, slot)
    } else if (from.slot !== undefined) {
      if (key.startsWith('id:')) place(key.slice(3), from.slot)
      else if (key === 'pool') removeAt(from.slot)
    }
  }

  const hint =
    picked?.kind === 'slot'
      ? 'Now tap another player to swap with'
      : picked?.kind === 'pool'
        ? full
          ? `Tap a player on court to swap with ${people.get(picked.id)?.displayName}`
          : 'Tap an open spot'
        : 'Tap or drag players to swap in/out'

  const team = (side: 'A' | 'B') => {
    const start = side === 'A' ? 0 : perTeam
    return (
      <div className={clsx('min-w-0 rounded-2xl border p-1.5', side === 'A' ? 'border-lime/25 bg-lime/5' : 'border-grape/35 bg-grape/8')}>
        <div className="mb-1.5 text-center text-xs font-bold">
          Team {side} <span className="font-medium text-muted">({perTeam})</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {lineup.slice(start, start + perTeam).map((id, i) => {
            const slot = start + i
            const player = id ? people.get(id) : undefined
            return player ? (
              <PlayerTile
                key={`${slot}-${id}`}
                player={player}
                drop={`slot:${slot}`}
                tone={side === 'A' ? 'lime' : 'grape'}
                paired={partnerOf?.has(player.userId)}
                selected={picked?.kind === 'slot' && picked.slot === slot}
                changed={id !== original[slot]}
                onTap={() => tapSlot(slot)}
                onDrop={(x, y) => drop({ slot }, x, y)}
                corner={
                  <CornerButton label={`Take ${player.displayName} off court`} tone="red" onClick={() => removeAt(slot)}>
                    <Minus className="size-3.5" strokeWidth={3.5} />
                  </CornerButton>
                }
              />
            ) : (
              <button
                key={`${slot}-empty`}
                type="button"
                data-drop={`slot:${slot}`}
                onClick={() => tapSlot(slot)}
                className={clsx(
                  'flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-[11px] font-semibold',
                  picked?.kind === 'pool' ? 'border-lime/80 text-lime' : 'border-white/20 text-muted',
                )}
              >
                <Plus className="size-5" />
                Open spot
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* On court */}
      <section className="rounded-3xl border-2 border-lime/70 bg-lime/8 p-2.5 shadow-[0_0_24px_-10px_rgb(183_243_59/0.8)]">
        <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
          <h3 className="font-display text-xl font-extrabold">{title}</h3>
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/75">{perTeam * 2} players max</span>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-ink/60 px-2 py-0.5 text-xs font-bold text-lime">
            <Users className="size-3.5" />
            {onCourt.size} / {perTeam * 2}
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
          {team('A')}
          <span className="vs-text px-0.5 text-2xl leading-none">VS</span>
          {team('B')}
        </div>
        <p className="mx-auto mt-2.5 flex w-fit items-center gap-1.5 rounded-full border border-lime/25 bg-ink/50 px-3 py-1 text-center text-xs text-lime" role="status">
          <Hand className="size-3.5 shrink-0" />
          {hint}
        </p>
        {note?.(lineup.filter(Boolean) as string[])}
        {split.length > 0 && (
          <p className="mt-2 text-center text-xs text-amber-200">
            {split
              .map((id) => `${people.get(id)?.displayName} & ${people.get(partnerOf!.get(id)!)?.displayName ?? 'partner'}`)
              .join(', ')}{' '}
            {split.length === 1 ? 'are partners' : 'are pairs'}: they'll be split for this game.
          </p>
        )}
      </section>

      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-grape/60" />
        <span className="grid size-9 place-items-center rounded-full border-2 border-lime/70 bg-ink text-lime">
          <ArrowDownUp className="size-4" />
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-grape/60" />
      </div>

      {/* Who can come in */}
      <section data-drop="pool" className="rounded-3xl border-2 border-grape/70 bg-grape/8 p-2.5 shadow-[0_0_24px_-12px_rgb(163_72_250/0.9)]">
        <div className="mb-2 flex items-center gap-2 px-1">
          <h3 className="font-display text-xl font-extrabold">Waiting</h3>
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/75">Not on court</span>
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#d6a8ff]">
            <Users className="size-3.5" />
            {waitingCount} player{waitingCount === 1 ? '' : 's'}
          </span>
        </div>
        {waitingCount === 0 && <p className="py-4 text-center text-sm text-muted">Nobody else is available right now.</p>}
        {pools
          .filter((p) => p.ids.length > 0)
          .map((pool, pi) => (
            <div key={pool.label} className={clsx(pi > 0 && 'mt-3')}>
              {pi > 0 && <div className="mb-1.5 px-1 text-xs font-semibold text-muted">{pool.label}</div>}
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {pool.ids.map((id) => {
                  const player = people.get(id)!
                  return (
                    <PlayerTile
                      key={id}
                      player={player}
                      drop={`id:${id}`}
                      tone="grape"
                      paired={partnerOf?.has(id)}
                      tag={pool.tag?.(id)}
                      selected={picked?.kind === 'pool' && picked.id === id}
                      onTap={() => tapPool(id)}
                      onDrop={(x, y) => drop({ id }, x, y)}
                      corner={
                        <CornerButton label={`Put ${player.displayName} on court`} tone="lime" onClick={() => add(id)}>
                          <Plus className="size-3.5" strokeWidth={3.5} />
                        </CornerButton>
                      }
                    />
                  )
                })}
              </div>
            </div>
          ))}
      </section>

      <div className="flex gap-2 pt-1">
        <Button variant="dark" pill className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="grape"
          pill
          className="flex-[1.6]"
          icon={<Check className="size-5" />}
          disabled={!full || !changed}
          loading={saving}
          onClick={() => onSave(lineup.slice(0, perTeam) as string[], lineup.slice(perTeam) as string[])}
        >
          {saveLabel}
        </Button>
      </div>
      {!full && <p className="text-center text-xs text-amber-200">Fill every spot on court to save.</p>}
    </div>
  )
}

function PlayerTile({
  player,
  drop,
  tone,
  tag,
  selected,
  changed,
  paired,
  corner,
  onTap,
  onDrop,
}: {
  player: PlayerCard
  drop: string
  tone: 'lime' | 'grape'
  tag?: string
  selected: boolean
  changed?: boolean
  paired?: boolean
  corner: ReactNode
  onTap: () => void
  onDrop: (clientX: number, clientY: number) => void
}) {
  const controls = useDragControls()
  return (
    <motion.div
      data-drop={drop}
      drag
      dragControls={controls}
      dragListener={false}
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.08, zIndex: 50 }}
      onDragEnd={(event) => {
        const point = 'changedTouches' in event ? (event as TouchEvent).changedTouches[0] : (event as PointerEvent)
        if (point) onDrop(point.clientX, point.clientY)
      }}
      className={clsx(
        'relative rounded-xl border bg-ink/60 transition-colors',
        selected ? 'border-lime ring-2 ring-lime' : changed ? 'border-sky/70' : 'border-white/12',
      )}
    >
      <button type="button" onClick={onTap} className="flex w-full min-w-0 flex-col items-center px-1 pt-3 pb-1.5" aria-pressed={selected}>
        <div className="relative">
          <span
            className={clsx(
              'absolute inset-x-0 bottom-0 mx-auto h-3 w-[90%] rounded-[50%] border-2',
              tone === 'lime' ? 'border-lime bg-lime/15' : 'border-grape bg-grape/20',
            )}
          />
          <PlayerAvatar player={player} size={48} className="relative" />
        </div>
        <span className="mt-1 w-full truncate rounded-full bg-night/80 px-1.5 py-0.5 text-center text-[11px] font-semibold">{player.displayName}</span>
        {tag && <span className="mt-0.5 text-[10px] font-semibold text-sky">{tag}</span>}
      </button>
      {/* Grip: the only place a drag starts, so scrolling the sheet on a phone still works. */}
      <span
        onPointerDown={(e) => controls.start(e)}
        className="absolute top-1 left-1 cursor-grab touch-none rounded p-0.5 text-white/45 active:cursor-grabbing"
        aria-hidden
      >
        <GripVertical className="size-3.5" />
      </span>
      <div className="absolute -top-1.5 -right-1.5">{corner}</div>
      {paired && <Link2 className="absolute top-1 right-5 size-3.5 text-lime" aria-label="Has a fixed partner" />}
    </motion.div>
  )
}

function CornerButton({ label, tone, onClick, children }: { label: string; tone: 'red' | 'lime'; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        'grid size-6 place-items-center rounded-full shadow ring-2 ring-ink',
        tone === 'red' ? 'bg-[#FF5A6E] text-snow' : 'bg-lime text-ink',
      )}
    >
      {children}
    </button>
  )
}
