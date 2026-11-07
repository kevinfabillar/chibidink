import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useState } from 'react'
import type { Pose } from '../../character3d/build'
import { Avatar3D } from '../../components/character/Avatar3D'
import { Scene } from '../../components/character/Backgrounds'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import type { CharacterLook } from '../../cosmetics/visuals'
import { POSES, setPose, usePose } from '../../lib/pose'

/** Pick a pose: tap one to try it on in the live preview, then Equip it. */
export function PoseSheet({ open, onClose, userId, look, backgroundId }: { open: boolean; onClose: () => void; userId: string; look: CharacterLook; backgroundId?: string | null }) {
  return (
    <Sheet open={open} onClose={onClose} title="Poses">
      {open && <Poses userId={userId} look={look} backgroundId={backgroundId} onEquipped={onClose} />}
    </Sheet>
  )
}

function Poses({ userId, look, backgroundId, onEquipped }: { userId: string; look: CharacterLook; backgroundId?: string | null; onEquipped: () => void }) {
  const equipped = usePose(userId)
  const [trying, setTrying] = useState<Pose>(equipped)
  const label = POSES.find((p) => p.id === trying)?.label

  return (
    <div>
      {/* Live preview stays pinned while you scroll the poses. */}
      <div className="sticky -top-5 z-10 -mx-5 bg-surface/95 px-5 pt-1 pb-3 backdrop-blur">
        <div className="relative mx-auto w-36 overflow-hidden rounded-3xl border border-white/10 min-[400px]:w-44">
          <Scene id={backgroundId} className="absolute inset-0 size-full" />
          <Avatar3D look={look} variant="full" pose={trying} live className="relative w-full" title={`${label} pose`} />
          {trying !== equipped && (
            <span className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-lime">
              Trying on
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {POSES.map((p) => (
          <button
            key={p.id}
            onClick={() => setTrying(p.id)}
            aria-pressed={trying === p.id}
            className={clsx(
              'relative flex flex-col items-center gap-1 rounded-2xl border-2 bg-night/70 p-1.5 pb-2 transition',
              trying === p.id ? 'border-lime shadow-[0_0_16px_-6px_rgb(183_243_59/0.9)]' : 'border-white/10 hover:border-white/30',
            )}
          >
            <Avatar3D look={{ ...look, aura: null }} variant="full" pose={p.id} className="w-full" />
            <span className="text-xs font-semibold">{p.label}</span>
            {equipped === p.id && (
              <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-lime text-ink" title="Equipped">
                <Check className="size-3.5" />
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="sticky -bottom-5 z-10 -mx-5 mt-4 border-t border-white/10 bg-surface/95 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mb-2 text-sm font-semibold">{label}</div>
        {trying === equipped ? (
          <Button block disabled icon={<Check className="size-5" />}>
            Equipped
          </Button>
        ) : (
          <Button
            block
            onClick={() => {
              setPose(userId, trying)
              onEquipped()
            }}
          >
            Equip pose
          </Button>
        )}
      </div>
    </div>
  )
}
