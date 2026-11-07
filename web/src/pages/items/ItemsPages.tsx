import clsx from 'clsx'
import { ChevronRight, Crown, Eye, Lock, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { CosmeticItem, CosmeticSlot, Cosmetics, Profile } from '../../api/types'
import { Avatar3D } from '../../components/character/Avatar3D'
import { AuraArt, EffectArt, ItemArt } from '../../components/character/ItemArt'
import { ItemAction, ItemCard, OptionTile } from '../../components/items/ItemParts'
import { ItemSheet } from '../../components/items/ItemSheet'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/primitives'
import { Chips, TopBar } from '../../components/ui/TopBar'
import { auraVisual, effectVisual, itemTag, lookOf, lookWith, rarityColor, slotInfo } from '../../cosmetics/visuals'
import { useCosmeticAction, useCosmetics, useMe } from '../../hooks/queries'
import { cosmeticsApi } from '../../api/api'
import { PageError } from '../../components/ui/ErrorPage'

/** Loads profile + cosmetics once for all item screens. */
function useItemsData() {
  const me = useMe()
  const cosmetics = useCosmetics()
  return { me: me.data, cosmetics: cosmetics.data, error: me.error ?? cosmetics.error }
}

function Loading({ error }: { error: unknown }) {
  return error ? <PageError error={error} onRetry={() => location.reload()} /> : <Spinner />
}

// ---- Items hub ------------------------------------------------------------------------------------

const HUB_SLOTS: CosmeticSlot[] = ['Outfit', 'Background', 'PaddleEffect', 'CharacterAura']

export function ItemsHubPage() {
  const { me, cosmetics, error } = useItemsData()
  if (!me || !cosmetics) return <Loading error={error} />
  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title="Items" sub="Everything is cosmetic. Earn coins by playing verified matches." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {HUB_SLOTS.map((slot) => {
          const items = cosmetics.items.filter((i) => i.slot === slot)
          const shown = items.find((i) => i.equipped) ?? items[0]
          return (
            <Link
              key={slot}
              to={slotInfo[slot].path}
              className="flex flex-col items-center rounded-3xl border border-white/10 bg-[radial-gradient(120%_80%_at_50%_100%,rgb(163_72_250/0.25),transparent_70%),var(--color-tile)] p-3 transition hover:border-lime/60"
            >
              {shown && <ItemArt item={shown} className="aspect-square w-[70%]" />}
              <div className="mt-1 font-display text-lg font-bold">{slotInfo[slot].title}</div>
              <div className="text-xs text-white/65">
                {items.filter((i) => i.owned).length} of {items.length} owned
              </div>
            </Link>
          )
        })}
      </div>
      <Link to="/shop" className="mt-4 flex items-center justify-between rounded-2xl border border-lime/50 bg-lime/10 px-4 py-3 font-display text-lg font-bold text-lime">
        Visit the Shop <ChevronRight className="size-6" />
      </Link>
    </div>
  )
}

// ---- Outfits grid --------------------------------------------------------------------------------

const GRID_FILTERS: Record<'Outfit' | 'Background', string[]> = {
  Outfit: ['All', 'Fun', 'Adventure', 'Fantasy', 'Glam'],
  Background: ['All'],
}

export function ItemGridPage({ slot }: { slot: 'Outfit' | 'Background' }) {
  const { me, cosmetics, error } = useItemsData()
  const [filter, setFilter] = useState('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  if (!me || !cosmetics) return <Loading error={error} />

  const items = cosmetics.items.filter((i) => i.slot === slot && (filter === 'All' || itemTag(i) === filter))
  const selected = cosmetics.items.find((i) => i.id === selectedId) ?? null

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar back="/items" title={slotInfo[slot].title} />
      <Chips value={filter} options={GRID_FILTERS[slot]} onChange={setFilter} />
      <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onClick={() => setSelectedId(item.id)} />
        ))}
      </div>
      <ItemSheet item={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}

// ---- Effects (glow on the outfit's item) ------------------------------------------------------------------------------

export function EffectsPage() {
  const { me, cosmetics, error } = useItemsData()
  const [selectedId, setSelectedId] = useState<string | null | undefined>(undefined)
  if (!me || !cosmetics) return <Loading error={error} />

  const effects = cosmetics.items.filter((i) => i.slot === 'PaddleEffect')
  const currentId = selectedId === undefined ? cosmetics.loadout.effectId : selectedId
  const item = effects.find((e) => e.id === currentId) ?? null
  const look = lookWith(lookOf(me.player), 'PaddleEffect', item?.id ?? null)

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar back="/items" title="Effects" sub="A glow on your outfit's item." />
      <section className="grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-3 rounded-3xl border border-white/10 bg-[radial-gradient(90%_70%_at_40%_60%,rgb(163_72_250/0.25),transparent_70%),var(--color-tile)] p-3">
        <Avatar3D look={look} variant="full" pose="swing" live interactive className="w-full max-w-72" />
        <InfoCard item={item} emptyTitle="None" emptyText="No effect" cosmetics={cosmetics} me={me} slot="PaddleEffect" />
      </section>
      <SelectorRow>
        <OptionTile selected={!item} label="None" art={<NoneIcon />} onClick={() => setSelectedId(null)} equipped={!cosmetics.loadout.effectId} />
        {effects.map((e) => (
          <OptionTile
            key={e.id}
            selected={item?.id === e.id}
            equipped={e.equipped}
            locked={!e.owned && !e.unlocked}
            label={e.name}
            art={<EffectArt effect={effectVisual(e.id)!} className="w-full" />}
            onClick={() => setSelectedId(e.id)}
          />
        ))}
      </SelectorRow>
    </div>
  )
}

// ---- Auras ---------------------------------------------------------------------------------------

export function AurasPage() {
  const { me, cosmetics, error } = useItemsData()
  const [selectedId, setSelectedId] = useState<string | null | undefined>(undefined)
  const [previewing, setPreviewing] = useState(false)
  if (!me || !cosmetics) return <Loading error={error} />

  const auras = cosmetics.items.filter((i) => i.slot === 'CharacterAura').sort((a, b) => a.requiredLevel - b.requiredLevel)
  const currentId = selectedId === undefined ? (cosmetics.loadout.auraId ?? auras.find((a) => !a.unlocked)?.id ?? null) : selectedId
  const item = auras.find((a) => a.id === currentId) ?? null
  const locked = !!item && !item.owned && !item.unlocked
  const select = (id: string | null) => {
    setSelectedId(id)
    setPreviewing(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar back="/items" title="Auras" />
      <Chips value="All" options={['All']} onChange={() => undefined} />
      <section className="grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-3 rounded-3xl border border-white/10 bg-[radial-gradient(90%_70%_at_40%_60%,rgb(163_72_250/0.25),transparent_70%),var(--color-tile)] p-3">
        <div className="relative">
          {locked && !previewing ? (
            <>
              <AuraArt aura={auraVisual(item.id)!} className="w-full max-w-72" />
              <span className="absolute top-[30%] left-1/2 grid size-12 -translate-x-1/2 place-items-center rounded-full bg-ink/80 text-white">
                <Lock className="size-6" />
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <Avatar3D look={lookWith(lookOf(me.player), 'CharacterAura', item?.id ?? null)} variant="full" pose="victory" live interactive pedestal className="w-full max-w-72" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <InfoCard item={item} emptyTitle="None" emptyText="No aura" cosmetics={cosmetics} me={me} slot="CharacterAura" />
          {locked && (
            <Button block variant="dark" icon={previewing ? <X className="size-4.5" /> : <Eye className="size-4.5" />} onClick={() => setPreviewing((p) => !p)}>
              {previewing ? 'Stop' : 'Preview'}
            </Button>
          )}
        </div>
      </section>
      <SelectorRow>
        <OptionTile selected={!item} label="None" art={<NoneIcon />} onClick={() => select(null)} equipped={!cosmetics.loadout.auraId} />
        {auras.map((a) => (
          <OptionTile
            key={a.id}
            selected={item?.id === a.id}
            equipped={a.equipped}
            locked={!a.owned && !a.unlocked}
            label={a.name}
            sub={`Lv.${a.requiredLevel}`}
            art={<AuraArt aura={auraVisual(a.id)!} className="w-full" />}
            onClick={() => select(a.id)}
          />
        ))}
      </SelectorRow>
    </div>
  )
}

// ---- Shared bits ---------------------------------------------------------------------------------

function InfoCard({
  item,
  emptyTitle,
  emptyText,
  cosmetics,
  me,
  slot,
}: {
  item: CosmeticItem | null
  emptyTitle: string
  emptyText: string
  cosmetics: Cosmetics
  me: Profile
  slot: CosmeticSlot
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-ink/75 p-3 text-center">
      <div className="font-display text-xl leading-tight font-bold">{item?.name ?? emptyTitle}</div>
      <div className="mb-3 text-sm font-semibold" style={{ color: item ? rarityColor[item.rarity] : undefined }}>
        {item?.rarity ?? emptyText}
      </div>
      {item && !item.owned && !item.unlocked && (
        <div className="mb-3 flex items-center justify-center gap-1.5 text-sm text-white/80">
          <Crown className="size-4 text-[#FBBF24]" /> Unlock at Lv {item.requiredLevel}
        </div>
      )}
      {item ? <ItemAction item={item} coins={me.progress.coins} /> : <RemoveSlot slot={slot} equippedId={slot === 'PaddleEffect' ? cosmetics.loadout.effectId : cosmetics.loadout.auraId} />}
    </div>
  )
}

function RemoveSlot({ slot, equippedId }: { slot: CosmeticSlot; equippedId: string | null }) {
  const remove = useCosmeticAction(() => cosmeticsApi.unequip(slot))
  if (!equippedId)
    return (
      <Button block disabled>
        Equipped
      </Button>
    )
  return (
    <Button block loading={remove.isPending} onClick={() => remove.mutate()}>
      Equip
    </Button>
  )
}

function SelectorRow({ children }: { children: React.ReactNode }) {
  return <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">{children}</div>
}

function NoneIcon() {
  return (
    <span className={clsx('grid size-9 place-items-center rounded-full border-2 border-white/70 text-white/80')}>
      <X className="size-5" />
    </span>
  )
}
