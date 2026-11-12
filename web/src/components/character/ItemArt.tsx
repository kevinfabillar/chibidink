import type { CosmeticItem } from '../../api/types'
import { auraVisual, effectVisual, outfitVisual, type AuraVisual, type EffectVisual, type OutfitVisual } from '../../cosmetics/visuals'
import { useSvgIds } from '../../lib/svgIds'
import { Scene } from './Backgrounds'
import { GearIcon } from './gearArt'
import { AuraBack, AuraDefs, AuraFront } from './parts/Aura'
import { NameTag } from './NameTag'
import { nameplateVisual } from '../../cosmetics/nameplates'

type ArtProps = { className?: string }

/** Picks the right artwork for any cosmetic item. */
export function ItemArt({ item, className }: { item: Pick<CosmeticItem, 'id' | 'slot'> } & ArtProps) {
  switch (item.slot) {
    case 'Outfit':
      return <OutfitArt outfit={outfitVisual(item.id)} className={className} />
    case 'PaddleEffect': {
      const effect = effectVisual(item.id)
      return effect ? <EffectArt effect={effect} className={className} /> : null
    }
    case 'CharacterAura': {
      const aura = auraVisual(item.id)
      return aura ? <AuraArt aura={aura} className={className} /> : null
    }
    case 'Background':
      return <Scene id={item.id} className={`${className ?? ''} rounded-xl`} />
    case 'Nameplate': {
      const plate = nameplateVisual(item.id)
      return plate ? (
        <span className={`${className ?? ''} grid place-items-center`}>
          <NameTag name="Name" plate={plate} size="md" />
        </span>
      ) : null
    }
    default:
      return null // paddles are retired
  }
}

/** An outfit's gear on its own: the hat with its held item (sneakers for the basic set). */
export function OutfitArt({ outfit: o, className }: { outfit: OutfitVisual } & ArtProps) {
  const ids = useSvgIds('steel', 'gold', 'blade', 'ball', 'blur', 'faceClip')
  return (
    <svg viewBox="60 -110 560 560" className={className} aria-hidden>
      <defs>
        <radialGradient id={ids.steel} cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.35" stopColor="#C9D1DC" />
          <stop offset="0.75" stopColor="#7D8798" />
          <stop offset="1" stopColor="#4A5262" />
        </radialGradient>
        <linearGradient id={ids.gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBE7A1" />
          <stop offset="0.5" stopColor="#D9AE4A" />
          <stop offset="1" stopColor="#94701F" />
        </linearGradient>
        <linearGradient id={ids.blade} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F4F7FB" />
          <stop offset="0.5" stopColor="#C3CCD8" />
          <stop offset="0.51" stopColor="#8E99AA" />
          <stop offset="1" stopColor="#B8C1CE" />
        </linearGradient>
        <radialGradient id={ids.ball} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#F6FF9E" />
          <stop offset="1" stopColor="#9DB518" />
        </radialGradient>
        <filter id={ids.blur}>
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <clipPath id={ids.faceClip}>
          <rect x="110" y="140" width="380" height="80" />
        </clipPath>
      </defs>
      <GearIcon gear={o.gear} p={{ steel: `url(#${ids.steel})`, gold: `url(#${ids.gold})`, blade: `url(#${ids.blade})`, ball: `url(#${ids.ball})`, blur: ids.blur, faceClip: ids.faceClip }} />
    </svg>
  )
}

/** A glowing ring in the effect's colour, like the selector in the Paddle Effects screen. */
export function EffectArt({ effect, className }: { effect: EffectVisual } & ArtProps) {
  const ids = useSvgIds('blur')
  const c = effect.color
  return (
    <svg viewBox="-32 -28 64 52" className={className} aria-hidden>
      <defs>
        <filter id={ids.blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
      </defs>
      <ellipse cx={0} cy={8} rx={22} ry={8} fill={c} opacity={0.18} />
      <ellipse cx={0} cy={8} rx={22} ry={8} fill="none" stroke={c} strokeWidth={4} filter={`url(#${ids.blur})`} className="cd-glow" />
      <ellipse cx={0} cy={8} rx={22} ry={8} fill="none" stroke={c} strokeWidth={1.5} />
      <path d="M-15 4 C-12 -14 12 -14 15 4" stroke={c} strokeWidth={2} fill="none" opacity={0.75} strokeLinecap="round" className="cd-glow" />
      {effect.kind === 'pulse' && <ellipse cx={0} cy={8} rx={13} ry={4.5} fill="none" stroke={c} strokeWidth={1.2} opacity={0.8} />}
      {effect.kind === 'pulse' && <ellipse cx={0} cy={8} rx={26} ry={10} fill="none" stroke={c} strokeWidth={1.2} className="cd-ripple" />}
      {effect.kind === 'spark' && (
        <path d="M-6 -20 l4 6 l-5 1 l5 7 M8 -18 l-3 5 l4 1 l-4 6" stroke={c} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" className="cd-flicker" />
      )}
      {effect.kind === 'flame' && (
        <g fill={c}>
          <path d="M-5 0 q-5 -6 0 -16 q1 6 4 8 q1 -4 0 -8 q7 7 3 16 Z" className="cd-flick" />
          <path d="M6 1 q-3 -4 0 -10 q1 4 3 5 q1 -2 0 -5 q4 5 2 10 Z" opacity={0.8} className="cd-flick cd-d2" />
        </g>
      )}
      {effect.kind === 'wave' && <ellipse cx={0} cy={8} rx={28} ry={11} fill="none" stroke={c} strokeWidth={1.1} opacity={0.5} strokeDasharray="10 5" className="cd-dash" />}
    </svg>
  )
}

/** An aura around a dark character silhouette. */
export function AuraArt({ aura, className }: { aura: AuraVisual } & ArtProps) {
  const ids = useSvgIds('aura', 'auraBlur')
  return (
    <svg viewBox="-22 -2 204 214" className={className} aria-hidden>
      <defs>
        <AuraDefs aura={aura} ids={ids} />
      </defs>
      <AuraBack aura={aura} ids={ids} />
      <Silhouette rim={aura.color} />
      <AuraFront aura={aura} />
    </svg>
  )
}

/** The paddle character as a dark shape (used behind aura previews), mapped into the aura's stage. */
export function Silhouette({ rim }: { rim: string }) {
  return (
    <g transform={`translate(-22 -2) scale(${204 / 858}) translate(129 110)`} fill="#160F26" stroke={rim} strokeWidth={6} strokeLinejoin="round">
      <rect x="266" y="620" width="28" height="96" rx="14" />
      <rect x="306" y="620" width="28" height="96" rx="14" />
      <rect x="262" y="468" width="76" height="190" rx="24" />
      <path d="M130 352 L85 430 M470 352 L539 294" strokeWidth={42} stroke="#160F26" strokeLinecap="round" />
      <rect x="120" y="80" width="360" height="410" rx="150" />
    </g>
  )
}
