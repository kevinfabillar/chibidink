import type { CosmeticItem } from '../../api/types'
import { lookOf, lookWith, rarityColor } from '../../cosmetics/visuals'
import { useMe } from '../../hooks/queries'
import { Avatar3D } from '../character/Avatar3D'
import { PlayerName } from '../character/NameTag'
import { Scene } from '../character/Backgrounds'
import { Sheet } from '../ui/Sheet'
import { ItemAction } from './ItemParts'

/** Try an item on your own character, then buy or equip it. */
export function ItemSheet({ item, onClose }: { item: CosmeticItem | null; onClose: () => void }) {
  const me = useMe().data
  return (
    <Sheet open={!!item} onClose={onClose} title={item?.name ?? ''}>
      {item && me && (
        <div>
          <div className="relative mx-auto flex w-60 flex-col items-center overflow-hidden rounded-3xl">
            {item.slot === 'Background' && <Scene id={item.id} className="absolute inset-0 size-full" />}
            <Avatar3D
              look={lookWith(lookOf(me.player), item.slot, item.id)}
              variant="full"
              pose={item.slot === 'PaddleEffect' ? 'swing' : item.slot === 'CharacterAura' ? 'victory' : 'idle'}
              live
              interactive
              pedestal
              className="w-full"
            />
          </div>
          {item.slot === 'Nameplate' && (
            <div className="-mt-2 flex justify-center">
              <PlayerName player={{ displayName: me.player.displayName, loadout: { nameplateId: item.id } }} size="lg" />
            </div>
          )}
          <div className="my-4 flex items-center justify-center gap-3 text-sm">
            <span className="font-semibold" style={{ color: rarityColor[item.rarity] }}>
              {item.rarity}
            </span>
            {!item.isStarter && <span className="text-white/60">Unlocks at Lv {item.requiredLevel}</span>}
            {item.owned && <span className="text-lime">Owned</span>}
          </div>
          <ItemAction item={item} coins={me.progress.coins} />
        </div>
      )}
    </Sheet>
  )
}
