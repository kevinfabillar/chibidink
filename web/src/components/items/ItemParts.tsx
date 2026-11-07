import clsx from 'clsx'
import { Check, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { cosmeticsApi } from '../../api/api'
import type { CosmeticItem } from '../../api/types'
import { rarityColor } from '../../cosmetics/visuals'
import { useCosmeticAction } from '../../hooks/queries'
import { ItemArt } from '../character/ItemArt'
import { Button } from '../ui/Button'
import { CoinIcon } from '../ui/icons'
import { ErrorNote } from '../ui/primitives'

/** Grid card with rarity colours; lime border and check when equipped (Outfits / Paddles / Shop). */
export function ItemCard({ item, onClick, showPrice }: { item: CosmeticItem; onClick: () => void; showPrice?: boolean }) {
  const color = rarityColor[item.rarity]
  const locked = !item.owned && !item.unlocked
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative flex flex-col items-center rounded-2xl border-2 px-1.5 pt-2 pb-2 text-center transition hover:-translate-y-0.5',
        item.equipped && 'border-lime shadow-glow-lime',
      )}
      style={{
        background: `radial-gradient(120% 70% at 50% 100%, ${color}38, transparent 70%), var(--color-tile)`,
        ...(item.equipped ? null : { borderColor: `${color}B0`, boxShadow: `0 0 18px -8px ${color}` }),
      }}
    >
      <CornerBadge equipped={item.equipped} locked={locked} />
      <ItemArt item={item} className="cd-still aspect-square w-[84%]" />
      <div className="mt-1 font-display text-[15px] leading-tight font-bold">{item.name}</div>
      <div className="text-xs font-semibold" style={{ color: item.equipped ? '#B7F33B' : color }}>
        {item.equipped ? '(Equipped)' : item.rarity}
      </div>
      {showPrice && !item.owned && (
        <div className="mt-1 flex items-center gap-1 font-display text-base font-bold">
          <CoinIcon className="size-4.5" />
          {item.price.toLocaleString()}
        </div>
      )}
    </button>
  )
}

/** Small option tile for the horizontal selectors on the Effects and Auras screens. */
export function OptionTile({
  selected,
  equipped,
  locked,
  label,
  sub,
  art,
  onClick,
}: {
  selected: boolean
  equipped?: boolean
  locked?: boolean
  label: string
  sub?: string
  art: ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative flex w-[4.7rem] shrink-0 flex-col items-center rounded-xl border-2 p-1.5 text-center transition',
        selected ? 'border-lime bg-lime/10 shadow-glow-lime' : 'border-white/10 bg-night/80 hover:border-white/25',
      )}
    >
      <CornerBadge equipped={equipped} locked={locked} />
      <div className="cd-still grid aspect-square w-full place-items-center">{art}</div>
      <div className="text-[11px] leading-tight font-semibold">{label}</div>
      {sub && <div className="text-[10px] text-white/60">{sub}</div>}
    </button>
  )
}

function CornerBadge({ equipped, locked }: { equipped?: boolean; locked?: boolean }) {
  if (equipped)
    return (
      <span className="absolute top-1.5 right-1.5 z-10 grid size-5 place-items-center rounded-md bg-lime text-ink">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    )
  if (locked)
    return (
      <span className="absolute top-1.5 right-1.5 z-10 grid size-5 place-items-center rounded-md bg-ink/85 text-white/80">
        <Lock className="size-3" />
      </span>
    )
  return null
}

/** Buy / Equip / Unequip, with the reason when none is possible. */
export function ItemAction({ item, coins }: { item: CosmeticItem; coins: number }) {
  const buy = useCosmeticAction(() => cosmeticsApi.purchase(item.id))
  const equip = useCosmeticAction(() => cosmeticsApi.equip(item.id))
  const remove = useCosmeticAction(() => cosmeticsApi.unequip(item.slot))
  const removable = item.slot === 'PaddleEffect' || item.slot === 'CharacterAura'
  const error = buy.error ?? equip.error ?? remove.error

  let button: ReactNode
  if (item.equipped)
    button = removable ? (
      <Button block variant="dark" loading={remove.isPending} onClick={() => remove.mutate()}>
        Unequip
      </Button>
    ) : (
      <Button block disabled icon={<Check className="size-5" />}>
        Equipped
      </Button>
    )
  else if (item.owned)
    button = (
      <Button block loading={equip.isPending} onClick={() => equip.mutate()}>
        Equip
      </Button>
    )
  else if (!item.unlocked)
    button = (
      <Button block variant="dark" disabled icon={<Lock className="size-4.5" />}>
        Unlocks at Lv {item.requiredLevel}
      </Button>
    )
  else if (coins < item.price)
    button = (
      <Button block variant="dark" disabled icon={<CoinIcon className="size-5" />}>
        Need {(item.price - coins).toLocaleString()} more
      </Button>
    )
  else
    button = (
      <Button block loading={buy.isPending} onClick={() => buy.mutate()} icon={<CoinIcon className="size-5" />}>
        Buy for {item.price.toLocaleString()}
      </Button>
    )

  return (
    <div className="space-y-2">
      {button}
      <ErrorNote error={error} />
    </div>
  )
}
