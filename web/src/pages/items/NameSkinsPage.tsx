import clsx from 'clsx'
import { Check, Lock } from 'lucide-react'
import { useState } from 'react'
import { NameTag } from '../../components/character/NameTag'
import { CoinIcon } from '../../components/ui/icons'
import { ItemSheet } from '../../components/items/ItemSheet'
import { PageError } from '../../components/ui/ErrorPage'
import { Spinner } from '../../components/ui/primitives'
import { TopBar } from '../../components/ui/TopBar'
import { nameplateVisual } from '../../cosmetics/nameplates'
import { rarityColor, rarityRank } from '../../cosmetics/visuals'
import { useCosmetics, useMe } from '../../hooks/queries'

/** Premium name skins: your name, animated, wherever it shows (queue, courts, standings). */
export function NameSkinsPage() {
  const me = useMe().data
  const cosmetics = useCosmetics()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  if (!me || !cosmetics.data) return cosmetics.error ? <PageError error={cosmetics.error} onRetry={() => cosmetics.refetch()} /> : <Spinner />

  const skins = cosmetics.data.items
    .filter((i) => i.slot === 'Nameplate')
    .sort((a, b) => Number(b.owned) - Number(a.owned) || rarityRank[a.rarity] - rarityRank[b.rarity] || a.price - b.price)
  const selected = skins.find((i) => i.id === selectedId) ?? null

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar back="/items" title="Name Skins" sub="Premium. Your name shows like this in the queue, on courts and in the standings." />
      <div className="grid gap-3 sm:grid-cols-2">
        {skins.map((item) => {
          const plate = nameplateVisual(item.id)
          return (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={clsx(
                'relative flex flex-col items-center gap-3 rounded-3xl border bg-[var(--color-tile)] px-4 pt-7 pb-3 text-center transition hover:border-lime/60',
                item.equipped ? 'border-lime shadow-[0_0_16px_-6px_rgb(183_243_59/0.9)]' : 'border-white/10',
              )}
            >
              <span className={clsx("flex h-16 max-w-full items-center", !item.owned && !item.unlocked && "opacity-60")}>
                {plate && <NameTag name={me.player.displayName} plate={plate} size="lg" />}
              </span>
              <span className="flex w-full items-center justify-between gap-2 text-sm">
                <span className="font-display font-bold">{item.name}</span>
                <span className="font-semibold" style={{ color: rarityColor[item.rarity] }}>
                  {item.rarity}
                </span>
              </span>
              <span className="absolute top-2.5 right-2.5">
                {item.equipped ? (
                  <span className="grid size-6 place-items-center rounded-full bg-lime text-ink" title="Equipped">
                    <Check className="size-4" />
                  </span>
                ) : item.owned ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-lime">Owned</span>
                ) : item.unlocked ? (
                  <span className="flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-bold">
                    <CoinIcon className="size-3.5" />
                    {item.price.toLocaleString()}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-bold">
                    <Lock className="size-3" /> Lv {item.requiredLevel}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      <ItemSheet item={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}
