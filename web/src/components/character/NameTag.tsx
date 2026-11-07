import clsx from 'clsx'
import { Crown, Flame, Snowflake, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'
import { nameplateVisual, type EdgeKind, type NameplateVisual } from '../../cosmetics/nameplates'

type Size = 'sm' | 'md' | 'lg'

interface NameSource {
  displayName: string
  loadout?: { nameplateId?: string | null } | null
}

/**
 * A player's name. With a name skin equipped it's an animated tag (a living border, shining letters,
 * glow, particles); without one it's plain text styled by `className`, exactly as before.
 */
export function PlayerName({ player, size = 'sm', className, truncate }: { player: NameSource; size?: Size; className?: string; truncate?: boolean }) {
  const plate = nameplateVisual(player.loadout?.nameplateId)
  // `truncate`: a long name ends in "…". A skinned tag shortens its letters itself, so its border is never cut off.
  if (!plate) return <span className={truncate ? `block truncate ${className ?? ''}` : className}>{player.displayName}</span>
  // A skin looks the same everywhere: its own font and fixed sizes, not the surrounding text style.
  return <NameTag name={player.displayName} plate={plate} size={size} />
}

/** sm: lists (queue, courts, standings); md: name cards (home, character); lg: profile and previews. */
const SIZE: Record<Size, string> = {
  sm: 'text-sm px-2.5 py-0.5 gap-1',
  md: 'text-lg px-3.5 py-1 gap-1.5',
  lg: 'text-2xl px-5 py-1.5 gap-2',
}

const BADGE = { crown: Crown, zap: Zap, flame: Flame, snowflake: Snowflake }

// Where each particle starts (% across the tag) and its delay (s): spread out so they never move in step.
const PARTICLES: [number, number][] = [
  [10, 0],
  [28, 1.1],
  [47, 0.5],
  [66, 1.6],
  [84, 0.8],
  [38, 2.1],
]

/** The skin itself; also used for shop and wardrobe previews. */
export function NameTag({ name, plate, size = 'sm', className }: { name: string; plate: NameplateVisual; size?: Size; className?: string }) {
  const Badge = plate.badge ? BADGE[plate.badge] : null
  const style = {
    '--np-glow': plate.glow,
    '--np-ring': plate.ring.join(', '),
    background: plate.background,
    boxShadow: `inset 0 0 0.7em -0.2em ${plate.glow}88`,
  } as CSSProperties
  const letters = {
    backgroundImage: `linear-gradient(100deg, ${plate.text.join(', ')})`,
    filter: `drop-shadow(0 0 0.28em ${plate.glow}aa)`,
  } as CSSProperties

  return (
    <span className={clsx('np-tag relative inline-flex max-w-full min-w-0 items-center rounded-full align-middle font-display font-extrabold tracking-wide normal-case !overflow-visible', SIZE[size], plate.flicker && 'np-flicker', className)} style={style}>
      {/* The border: a breathing glow and a ring of the skin's colors. */}
      <span className="np-halo" aria-hidden />
      <span className="np-ring" aria-hidden />
      {plate.edge && <Edge kind={plate.edge} light={size === 'sm'} />}
      {plate.particle && (
        <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
          {(size === 'sm' ? PARTICLES.slice(0, 3) : PARTICLES).map(([x, delay], i) => (
            <span key={i} className={`np-p np-${plate.particle}`} style={{ left: `${x}%`, animationDelay: `${delay}s`, color: plate.particleColor } as CSSProperties} />
          ))}
        </span>
      )}
      {Badge && <Badge className="relative size-[1em] shrink-0" style={{ color: plate.ring[1], filter: `drop-shadow(0 0 0.25em ${plate.glow})` }} aria-hidden />}
      <span className="relative truncate bg-clip-text py-[0.06em] leading-[1.2] text-transparent" style={letters}>
        {name}
      </span>
    </span>
  )
}

// Positions (% along the edge), sizes and delays, hand-spread so the edge looks natural, not stamped.
// Fire: many soft, overlapping tongues [x %, height, flicker seconds, delay seconds]; tallest in the middle,
// lower toward the rounded ends, each on its own rhythm so the blaze never pulses in step.
const FLAMES: [number, number, number, number][] = Array.from({ length: 15 }, (_, i) => {
  const x = (i / 14) * 100
  const middle = 1 - Math.abs(x - 50) / 50 // 1 in the middle, 0 at the ends
  const wobble = [0.12, -0.08, 0.15, -0.1, 0.05, -0.14, 0.1][i % 7]
  return [x, 0.6 + middle * 0.45 + wobble, 0.75 + ((i * 7) % 5) * 0.12, ((i * 3) % 7) * 0.13]
})
const ICICLES: [number, number][] = [
  [12, 0.9],
  [22, 0.55],
  [34, 1.1],
  [47, 0.7],
  [60, 1],
  [72, 0.6],
  [84, 0.95],
]
const DRIPS: [number, number][] = [
  [18, 0],
  [41, 1.3],
  [63, 0.6],
  [82, 2],
]
const BOLTS: { left?: string; right?: string; top?: string; bottom?: string; rotate: number; delay: number }[] = [
  { left: '-0.35em', top: '-0.3em', rotate: -20, delay: 0 },
  { right: '-0.3em', bottom: '-0.35em', rotate: 160, delay: 0.7 },
  { left: '45%', top: '-0.55em', rotate: 10, delay: 1.3 },
  { right: '18%', bottom: '-0.55em', rotate: 190, delay: 2 },
]

/** The border's own effect: flames along the top, icicles or slime hanging below, lightning on the rim. */
function Edge({ kind, light }: { kind: EdgeKind; light: boolean }) {
  if (kind === 'fire')
    return (
      <span className="pointer-events-none absolute inset-x-[0.35em] -top-[0.7em] h-[0.9em]" aria-hidden>
        {/* Embers glowing along the top of the border: the base the flames rise from. */}
        <span className="np-embers" />
        {(light ? FLAMES.filter((_, i) => i % 2 === 0) : FLAMES).map(([x, height, speed, delay], i) => (
          <span key={i} className="np-fire" style={{ left: `${x}%`, '--s': height, animationDuration: `${speed}s`, animationDelay: `-${delay}s` } as CSSProperties} />
        ))}
      </span>
    )
  if (kind === 'ice')
    return (
      <span className="pointer-events-none absolute inset-x-[0.7em] -bottom-[0.5em] h-[0.55em]" aria-hidden>
        {ICICLES.map(([x, len], i) => (
          <span key={i} className="np-icicle" style={{ left: `${x}%`, '--l': len, animationDelay: `${i * 0.4}s` } as CSSProperties} />
        ))}
      </span>
    )
  if (kind === 'slime')
    return (
      <span className="pointer-events-none absolute inset-x-[0.8em] -bottom-[0.05em] h-[0.9em]" aria-hidden>
        {DRIPS.map(([x, delay], i) => (
          <span key={i} className="np-drip" style={{ left: `${x}%`, animationDelay: `${delay}s` } as CSSProperties} />
        ))}
      </span>
    )
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {BOLTS.map((b, i) => (
        <svg
          key={i}
          viewBox="0 0 12 20"
          className="np-bolt"
          style={{ left: b.left, right: b.right, top: b.top, bottom: b.bottom, rotate: `${b.rotate}deg`, animationDelay: `${b.delay}s` } as CSSProperties}
        >
          <path d="M7 0 1 11h4l-2 9 8-12H7l2-8z" fill="#FEF08A" />
        </svg>
      ))}
    </span>
  )
}
