import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { cosmeticsApi } from '../../api/api'
import type { CosmeticItem, CosmeticSlot, Loadout, Profile } from '../../api/types'
import { Avatar3D } from '../../components/character/Avatar3D'
import { STARTER_BACKGROUND, Scene } from '../../components/character/Backgrounds'
import { ChibiAvatar } from '../../components/character/ChibiAvatar'
import { ItemAction } from '../../components/items/ItemParts'
import { Button } from '../../components/ui/Button'
import { CoinIcon } from '../../components/ui/icons'
import { ErrorNote, Spinner } from '../../components/ui/primitives'
import { Sheet } from '../../components/ui/Sheet'
import { Chips } from '../../components/ui/TopBar'
import { type CharacterLook, lookFrom, lookWith, rarityColor, rarityRank } from '../../cosmetics/visuals'
import { useCosmetics } from '../../hooks/queries'

export const WARDROBE_TABS = [
  { label: 'Outfits', slot: 'Outfit' },
  { label: 'Scenes', slot: 'Background' },
  { label: 'Auras', slot: 'CharacterAura' },
  { label: 'Effects', slot: 'PaddleEffect' },
] as const satisfies readonly { label: string; slot: CosmeticSlot }[]
export type WardrobeTab = (typeof WARDROBE_TABS)[number]['label']

const LOADOUT_KEY = { Outfit: 'outfitId', Background: 'backgroundId', CharacterAura: 'auraId', PaddleEffect: 'effectId' } as const
type WardrobeSlot = keyof typeof LOADOUT_KEY
const REMOVABLE: WardrobeSlot[] = ['CharacterAura', 'PaddleEffect']

/**
 * Change outfit, scene, aura or effect without leaving the character screen: tap an item to try it on,
 * then Equip (or Buy) it. A check marks what's actually equipped.
 */
export function WardrobeSheet({ open, tab, onTab, onClose, profile }: { open: boolean; tab: WardrobeTab; onTab: (t: WardrobeTab) => void; onClose: () => void; profile: Profile }) {
  return (
    <Sheet open={open} onClose={onClose} title="Wardrobe">
      {open && <Wardrobe tab={tab} onTab={onTab} profile={profile} />}
    </Sheet>
  )
}

function Wardrobe({ tab, onTab, profile }: { tab: WardrobeTab; onTab: (t: WardrobeTab) => void; profile: Profile }) {
  const cosmetics = useCosmetics()
  const queryClient = useQueryClient()
  // What you're trying on (not equipped until you press Equip). null = "None" for auras/effects.
  const [preview, setPreview] = useState<Partial<Record<WardrobeSlot, string | null>>>({})
  const remove = useMutation({
    mutationFn: (slot: WardrobeSlot) => cosmeticsApi.unequip(slot),
    onSettled: () => queryClient.invalidateQueries(),
  })

  if (!cosmetics.data) return cosmetics.error ? <ErrorNote error={cosmetics.error} /> : <Spinner />
  const slot = WARDROBE_TABS.find((t) => t.label === tab)!.slot
  const worn = (s: WardrobeSlot) => {
    const id = cosmetics.data!.loadout[LOADOUT_KEY[s]] ?? null
    return s === 'Background' ? (id ?? STARTER_BACKGROUND) : id
  }
  const shown = (s: WardrobeSlot) => (preview[s] !== undefined ? preview[s]! : worn(s))

  // The preview wears everything you're trying on, on top of what's equipped.
  const loadout: Loadout = { ...cosmetics.data.loadout }
  for (const s of Object.keys(LOADOUT_KEY) as WardrobeSlot[]) (loadout as unknown as Record<string, string | null>)[LOADOUT_KEY[s]] = shown(s)
  const look = lookFrom(profile.player.appearance, loadout)

  const items = cosmetics.data.items
    .filter((i) => i.slot === slot)
    .sort((a, b) => Number(b.owned) - Number(a.owned) || rarityRank[a.rarity] - rarityRank[b.rarity] || a.price - b.price)
  const pick = (id: string | null) => setPreview((p) => ({ ...p, [slot]: id === worn(slot) ? undefined : id }))
  const selectedId = shown(slot)
  const selected = items.find((i) => i.id === selectedId) ?? null
  const trying = preview[slot] !== undefined

  return (
    <div>
      {/* Live preview stays pinned while you scroll the items. */}
      <div className="sticky -top-5 z-10 -mx-5 bg-surface/95 px-5 pt-1 backdrop-blur">
        <div className="relative mx-auto mb-3 w-36 overflow-hidden rounded-3xl border border-white/10 min-[400px]:w-44">
          <Scene id={shown('Background')} className="absolute inset-0 size-full" />
          <Avatar3D look={look} variant="full" pose={slot === 'PaddleEffect' ? 'swing' : 'idle'} className="relative w-full" title="Preview" />
          {Object.values(preview).some((v) => v !== undefined) && (
            <span className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-lime">
              Trying on
            </span>
          )}
        </div>
        <Chips value={tab} options={WARDROBE_TABS.map((t) => t.label)} onChange={onTab} />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {REMOVABLE.includes(slot) && (
          <Tile selected={selectedId === null} equipped={worn(slot) === null} onClick={() => pick(null)} label="None" art={<WearingArt look={look} slot={slot} id={null} />} />
        )}
        {items.map((item) => (
          <Tile
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            equipped={worn(slot) === item.id}
            label={item.name}
            art={<WearingArt look={look} slot={slot} id={item.id} />}
            onClick={() => pick(item.id)}
          />
        ))}
      </div>

      {/* Equip / Buy for what you're trying on */}
      <div className="sticky -bottom-5 z-10 -mx-5 mt-4 border-t border-white/10 bg-surface/95 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-semibold">{selected ? selected.name : 'None'}</span>
          {selected && <span style={{ color: rarityColor[selected.rarity] }}>{selected.rarity}</span>}
        </div>
        {selected ? (
          <ItemAction item={selected} coins={cosmetics.data.progress.coins} />
        ) : trying ? (
          <Button block loading={remove.isPending} onClick={() => remove.mutate(slot, { onSuccess: () => setPreview((p) => ({ ...p, [slot]: undefined })) })}>
            Remove {slot === 'CharacterAura' ? 'aura' : 'effect'}
          </Button>
        ) : (
          <Button block disabled icon={<Check className="size-5" />}>
            Equipped
          </Button>
        )}
        <ErrorNote error={remove.error} />
        <Link to="/shop" className="mt-2 block text-center text-xs font-semibold text-lime">
          Get more in the Shop
        </Link>
      </div>
    </div>
  )
}

/** Card art: your character (with everything else you have on) wearing this item. Scenes show you standing in them. */
function WearingArt({ look, slot, id }: { look: CharacterLook; slot: WardrobeSlot; id: string | null }) {
  if (slot !== 'Background') {
    // Only the Auras tab shows auras; elsewhere the glow would hide the item you're picking.
    const tried = lookWith(look, slot, id)
    return <ChibiAvatar look={slot === 'CharacterAura' ? tried : { ...tried, aura: null }} variant="full" className="relative h-full w-auto" />
  }
  // Scenes: a smaller character standing at the bottom, so the scene itself shows.
  return (
    <div className="relative size-full overflow-hidden rounded-xl">
      <Scene id={id} className="absolute inset-0 size-full" />
      <ChibiAvatar look={{ ...look, aura: null }} variant="full" className="absolute bottom-0 left-1/2 h-[62%] w-auto -translate-x-1/2" />
    </div>
  )
}

function Tile({ item, selected, equipped, label, art, onClick }: { item?: CosmeticItem; selected: boolean; equipped: boolean; label: string; art: React.ReactNode; onClick: () => void }) {
  const locked = item && !item.owned
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'relative flex flex-col items-center gap-1 rounded-2xl border-2 bg-night/70 p-1.5 pb-2 text-center transition',
        selected ? 'border-lime shadow-[0_0_16px_-6px_rgb(183_243_59/0.9)]' : 'border-white/10 hover:border-white/30',
      )}
    >
      <div className={clsx('cd-still grid aspect-square w-full place-items-center', locked && 'opacity-45')}>{art}</div>
      <span className="line-clamp-1 text-xs font-semibold">{label}</span>
      {item && (
        <span className="text-[10px] font-semibold" style={{ color: rarityColor[item.rarity] }}>
          {item.rarity}
        </span>
      )}
      {equipped && (
        <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-lime text-ink" title="Equipped">
          <Check className="size-3.5" />
        </span>
      )}
      {locked && (
        <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-ink/85 px-1.5 py-0.5 text-[10px] font-bold">
          {item.unlocked ? (
            <>
              <CoinIcon className="size-3" />
              {item.price.toLocaleString()}
            </>
          ) : (
            <>
              <Lock className="size-3" /> Lv {item.requiredLevel}
            </>
          )}
        </span>
      )}
    </button>
  )
}
