import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Trophy } from 'lucide-react'
import { useState } from 'react'
import { cosmeticsApi } from '../../api/api'
import { lookOf, lookWith, rarityColor } from '../../cosmetics/visuals'
import { queryKeys, useMe } from '../../hooks/queries'
import { kudosInfo } from '../../lib/kudos'
import { Confetti } from '../session/Podium'
import { Button } from '../ui/Button'
import { Avatar3D } from './Avatar3D'

const seenKey = (userId: string) => `chibidink-achievements-seen:${userId}`

function readSeen(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(seenKey(userId)) ?? '[]') as string[]
  } catch {
    return []
  }
}

function markSeen(userId: string, itemId: string) {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify([...new Set([...readSeen(userId), itemId])]))
  } catch {
    /* storage blocked: it may show again next visit */
  }
}

/**
 * "Achievement unlocked!" The moment a player earns an achievement skin (e.g. 50 Serves kudos) it pops up,
 * once, with their character already wearing it and a button to equip it. Checking the cosmetics also
 * hands over any skin that was earned meanwhile, so this polls gently.
 */
export function AchievementUnlocked() {
  const me = useMe().data
  const userId = me?.player.userId
  const cosmetics = useQuery({
    queryKey: queryKeys.cosmetics,
    queryFn: cosmeticsApi.get,
    enabled: !!userId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
  const [dismissed, setDismissed] = useState<string[]>([])
  const queryClient = useQueryClient()
  const equip = useMutation({
    mutationFn: (id: string) => cosmeticsApi.equip(id),
    onSettled: () => queryClient.invalidateQueries(),
  })

  if (!userId || !me || !cosmetics.data) return null
  const seen = readSeen(userId)
  const item = cosmetics.data.items.find((i) => i.achievement && i.owned && !seen.includes(i.id) && !dismissed.includes(i.id))
  if (!item?.achievement) return null

  const info = kudosInfo(item.achievement.kind)
  const Icon = info.icon
  const close = () => {
    markSeen(userId, item.id)
    setDismissed((d) => [...d, item.id])
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#070c14]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Achievement unlocked">
      <Confetti />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-[#F5C451]/60 bg-surface text-center shadow-[0_0_80px_-20px_#F5C451]">
        <div className="bg-gradient-to-b from-[#F5C451]/25 to-transparent px-6 pt-5">
          <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-[#F5C451]/60 bg-[#F5C451]/15 px-3 py-1 text-xs font-bold tracking-[0.18em] text-[#F5C451] uppercase">
            <Trophy className="size-4" /> Achievement unlocked
          </div>
          <h2 className="mt-3 font-display text-2xl leading-tight font-extrabold">Congrats, {me.player.displayName}!</h2>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted">
            <Icon className="size-4" style={{ color: info.color }} />
            You received {item.achievement.required} {info.label} kudos
          </p>
          <Avatar3D look={lookWith(lookOf(me.player), 'Outfit', item.id)} variant="full" live pedestal className="mx-auto -mb-2 w-60" title={item.name} />
        </div>
        <div className="px-6 pb-6">
          <div className="font-display text-xl font-extrabold">{item.name}</div>
          <div className="mb-4 flex items-center justify-center gap-1 text-sm font-bold" style={{ color: rarityColor[item.rarity] }}>
            <Sparkles className="size-4" /> {item.rarity} skin · earned, not sold
          </div>
          <div className="flex gap-2">
            <Button block variant="dark" onClick={close}>
              Later
            </Button>
            <Button
              block
              loading={equip.isPending}
              onClick={() =>
                equip.mutate(item.id, {
                  onSuccess: close,
                })
              }
            >
              Equip now
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
