import { ChevronRight, Sparkles, Star } from 'lucide-react'
import { useState } from 'react'
import type { CosmeticSlot } from '../../api/types'
import { Avatar3D } from '../../components/character/Avatar3D'
import { ItemCard } from '../../components/items/ItemParts'
import { ItemSheet } from '../../components/items/ItemSheet'
import { Spinner } from '../../components/ui/primitives'
import { Chips, TopBar } from '../../components/ui/TopBar'
import { lookOf, lookWith, rarityRank } from '../../cosmetics/visuals'
import { useCosmetics, useMe } from '../../hooks/queries'
import { PartyPopper } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageError } from '../../components/ui/ErrorPage'

const TABS = ['Featured', 'Outfits', 'Backgrounds', 'Auras', 'Effects'] as const
type Tab = (typeof TABS)[number]
const TAB_SLOT: Record<Exclude<Tab, 'Featured'>, CosmeticSlot> = {
  Outfits: 'Outfit',
  Backgrounds: 'Background',
  Auras: 'CharacterAura',
  Effects: 'PaddleEffect',
}

export function ShopPage() {
  const me = useMe().data
  const cosmetics = useCosmetics()
  const [tab, setTab] = useState<Tab>('Featured')
  const [showAll, setShowAll] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (!me || !cosmetics.data) return cosmetics.error ? <PageError error={cosmetics.error} onRetry={() => cosmetics.refetch()} /> : <Spinner />
  const items = cosmetics.data.items
  const forSale = items.filter((i) => !i.isStarter && i.slot !== 'Paddle')
  const byRarity = [...forSale].sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity] || a.price - b.price)

  const list =
    tab === 'Featured'
      ? showAll
        ? byRarity
        : byRarity.filter((i) => !i.owned).slice(0, 6)
      : byRarity.filter((i) => i.slot === TAB_SLOT[tab])
  const selected = items.find((i) => i.id === selectedId) ?? null

  const bannerLook = lookWith(lookOf(me.player), 'Outfit', 'cyber-set')

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title="Shop" />
      <Chips value={tab} options={TABS} onChange={(t) => setTab(t)} />

      {tab === 'Featured' && (
        <button
          onClick={() => setTab('Outfits')}
          className="relative mb-5 flex w-full items-center overflow-hidden rounded-3xl border border-[#E879F9]/50 bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#C026D3] p-4 text-left shadow-glow-grape"
        >
          <Star className="absolute top-3 left-[46%] size-4 fill-[#FDE68A] text-[#FDE68A]" />
          <Sparkles className="absolute bottom-3 left-[8%] size-5 text-[#FDE68A]" />
          <div className="relative z-10 min-w-0 flex-1">
            <div className="font-display text-2xl leading-tight font-extrabold italic" style={{ textShadow: '0 2px 0 rgb(0 0 0 / 0.35)' }}>
              Season 1 Collection
            </div>
            <div className="text-sm text-white/90">New gear for the courts!</div>
          </div>
          <Avatar3D look={bannerLook} variant="full" pose="victory" className="relative -my-6 w-32 shrink-0" />
          <ChevronRight className="relative z-10 size-7 shrink-0 text-[#FDE68A]" />
        </button>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">{tab === 'Featured' ? 'Featured Items' : tab}</h2>
        {tab === 'Featured' && (
          <button onClick={() => setShowAll((s) => !s)} className="flex items-center gap-0.5 text-sm font-semibold text-lime">
            {showAll ? 'Show less' : 'See All'} <ChevronRight className="size-4" />
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<PartyPopper className="size-7" />} title="All collected!" text="You own everything here. New items show up as you level up." />
      ) : (
        <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4">
          {list.map((item) => (
            <ItemCard key={item.id} item={item} showPrice onClick={() => setSelectedId(item.id)} />
          ))}
        </div>
      )}
      <ItemSheet item={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}
