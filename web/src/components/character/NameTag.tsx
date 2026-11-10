import clsx from 'clsx'
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { nameplateVisual, type BorderKind, type NameplateVisual } from '../../cosmetics/nameplates'
import { useSvgIds } from '../../lib/svgIds'
import './nameTag.css'

type Size = 'sm' | 'md' | 'lg'

interface NameSource {
  displayName: string
  loadout?: { nameplateId?: string | null } | null
}

/**
 * A player's name. With a name skin equipped it's an animated tag; without one it's plain text styled by
 * `className`, exactly as before.
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

// Where each particle starts (% across the tag) and its delay (s): spread out so they never move in step.
const PARTICLES: [number, number][] = [
  [10, 0],
  [28, 1.1],
  [47, 0.5],
  [66, 1.6],
  [84, 0.8],
  [38, 2.1],
]

/** Steady 0–1 noise: the same tag always looks the same, so nothing reshuffles when the page re-renders. */
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

const bySize = (size: Size, sm: number, md: number, lg: number) => (size === 'sm' ? sm : size === 'md' ? md : lg)

/**
 * The skin itself; also used for shop and wardrobe previews.
 * Common to Epic: a rounded pill. Legendary: a hexagon badge. Mythic: the border is made of an element.
 */
export function NameTag({ name, plate, size = 'sm', className }: { name: string; plate: NameplateVisual; size?: Size; className?: string }) {
  const hex = plate.tier === 'legendary'
  const style = {
    '--np-glow': plate.glow,
    '--np-ring': plate.ring.join(', '),
    ...(hex ? {} : { background: plate.background, boxShadow: `inset 0 0 0.7em -0.2em ${plate.glow}88` }),
  } as CSSProperties
  const letters = {
    backgroundImage: `linear-gradient(100deg, ${plate.text.join(', ')})`,
    filter: `drop-shadow(0 0 0.28em ${plate.glow}aa)`,
  } as CSSProperties

  return (
    <span
      className={clsx(
        'np-tag relative inline-flex max-w-full min-w-0 items-center align-middle font-display font-extrabold tracking-wide normal-case !overflow-visible',
        SIZE[size],
        hex ? 'np-shape-hex np-shaped' : 'rounded-full',
        plate.border && `np-b-${plate.border}`,
        plate.flicker && 'np-flicker',
        className,
      )}
      style={style}
    >
      {hex ? <HexFrame background={plate.background} /> : <RoundFrame mythic={plate.tier === 'mythic'} />}
      {plate.drips && <Drips />}
      {plate.border && <ElementBorder kind={plate.border} size={size} />}
      {plate.particle && (
        <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
          {(size === 'sm' ? PARTICLES.slice(0, 3) : PARTICLES).map(([x, delay], i) => (
            <span key={i} className={`np-p np-${plate.particle}`} style={{ left: `${x}%`, animationDelay: `${delay}s`, color: plate.particleColor } as CSSProperties} />
          ))}
        </span>
      )}
      <span className="relative truncate bg-clip-text py-[0.06em] leading-[1.2] text-transparent" style={letters}>
        {name}
      </span>
    </span>
  )
}

/** Legendary: a hexagon badge with a soft glow and a light sweeping across. */
function HexFrame({ background }: { background: string }) {
  return (
    <>
      <span className="np-shape-glow" aria-hidden>
        <span className="np-shape np-shape-fill-glow" />
      </span>
      <span className="np-shape np-frame" aria-hidden />
      <span className="np-shape np-fill" style={{ background }} aria-hidden />
      <span className="np-shape np-fill np-sweep-clip" aria-hidden>
        <span className="np-sweep" />
      </span>
    </>
  )
}

/** Common to Epic: a glowing ring. Mythic: the ring's colors orbit, a ripple pulses out and a light sweeps across. */
function RoundFrame({ mythic }: { mythic: boolean }) {
  return (
    <>
      <span className="np-halo" aria-hidden />
      {mythic && <span className="np-ripple" aria-hidden />}
      {mythic ? (
        <span className="np-ring np-ring-spin" aria-hidden>
          <span className="np-ring-conic" />
        </span>
      ) : (
        <span className="np-ring" aria-hidden />
      )}
      {mythic && (
        <span className="np-sweep-clip" aria-hidden>
          <span className="np-sweep" />
        </span>
      )}
    </>
  )
}

const DRIPS: [number, number][] = [
  [18, 0],
  [41, 1.3],
  [63, 0.6],
  [82, 2],
]

/** Toxic: slime dripping off the bottom edge. */
function Drips() {
  return (
    <span className="np-drips" aria-hidden>
      {DRIPS.map(([x, delay], i) => (
        <span key={i} className="np-drip" style={{ left: `${x}%`, animationDelay: `${delay}s` }} />
      ))}
    </span>
  )
}

// ---- Mythic: the border made of an element ------------------------------------------------------------
//
// Pieces (flames, shards, beads…) sit on the tag's real outline. The outline of a pill is a straight top and
// bottom plus a half circle at each end, so the border is laid out as three boxes in a row: a left end exactly
// half as wide as the tag is tall, the straight middle, and a right end. Spots on the ends sit on a circle, in
// percentages of their box, so they follow the curve at any name length. Each piece is turned to face outward.

interface Spot {
  left: string
  top: string
  /** Outward direction in degrees: 90 = up, 0 = right, 180 = left, 270 = down. */
  angle: number
  where: 'top' | 'bottom' | 'end'
}

interface Outline {
  left: Spot[]
  top: Spot[]
  bottom: Spot[]
  right: Spot[]
}

function edgeSpots(n: number, where: 'top' | 'bottom'): Spot[] {
  return Array.from({ length: n }, (_, i) => ({
    left: `${(((i + 0.5) / n) * 100).toFixed(2)}%`,
    top: where === 'top' ? '0%' : '100%',
    angle: where === 'top' ? 90 : 270,
    where,
  }))
}

function endSpots(n: number, side: 'left' | 'right'): Spot[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n
    const angle = side === 'left' ? 90 + 180 * t : 90 - 180 * t
    const rad = (angle * Math.PI) / 180
    // Left end: circle centered on the box's right edge; right end: on its left edge. Radius = the box's width.
    const x = side === 'left' ? 100 + 100 * Math.cos(rad) : 100 * Math.cos(rad)
    return { left: `${x.toFixed(2)}%`, top: `${(50 - 50 * Math.sin(rad)).toFixed(2)}%`, angle, where: 'end' as const }
  })
}

const outline = (top: number, bottom: number, ends: number): Outline => ({
  left: endSpots(ends, 'left'),
  top: edgeSpots(top, 'top'),
  bottom: edgeSpots(bottom, 'bottom'),
  right: endSpots(ends, 'right'),
})

/** Places a piece on every spot, turned to face outward (or as `turn` says). */
function Around({ spots, piece, turn = (s) => 90 - s.angle }: { spots: Outline; piece: (s: Spot, i: number) => ReactNode; turn?: (s: Spot, i: number) => number }) {
  let n = 0
  const at = (s: Spot) => {
    const i = n++
    return (
      <span key={i} className="np-pt" style={{ left: s.left, top: s.top, transform: `rotate(${turn(s, i).toFixed(1)}deg)` }}>
        {piece(s, i)}
      </span>
    )
  }
  return (
    <span className="np-perim" aria-hidden>
      <span className="np-end">{spots.left.map(at)}</span>
      <span className="np-mid">
        {spots.top.map(at)}
        {spots.bottom.map(at)}
      </span>
      <span className="np-end">{spots.right.map(at)}</span>
    </span>
  )
}

function ElementBorder({ kind, size }: { kind: BorderKind; size: Size }) {
  switch (kind) {
    case 'fire':
      return <FireBorder size={size} />
    case 'ice':
      return <IceBorder size={size} />
    case 'lightning':
      return <LightningBorder size={size} />
    case 'cosmic':
      return <CosmicBorder size={size} />
    case 'gold':
      return <GoldBorder size={size} />
    case 'hearts':
      return <HeartsBorder size={size} />
    case 'butterfly':
      return <ButterflyBorder size={size} />
    case 'rose':
      return <RoseBorder size={size} />
    case 'tiara':
      return <TiaraBorder size={size} />
  }
}

/** Inferno: flames rising all around the border (tallest on top, licking up around the ends) on an ember ring. */
function FireBorder({ size }: { size: Size }) {
  const spots = outline(bySize(size, 6, 9, 12), 0, bySize(size, 3, 4, 5))
  return (
    <Around
      spots={spots}
      // Fire rises: flames on the ends lean outward but still point up.
      turn={(s, i) => (s.where === 'top' ? (rand(i + 3) - 0.5) * 18 : (90 - s.angle) * 0.5)}
      piece={(s, i) => {
        const up = (Math.sin((s.angle * Math.PI) / 180) + 1) / 2 // 1 on top, ½ on the sides, 0 at the bottom
        const height = 0.45 + 0.6 * up + (rand(i + 11) - 0.5) * 0.3
        return (
          <span
            className="np-flame"
            style={{ '--s': height.toFixed(2), animationDuration: `${(0.7 + rand(i + 5) * 0.6).toFixed(2)}s`, animationDelay: `-${rand(i + 7).toFixed(2)}s` } as CSSProperties}
          />
        )
      }}
    />
  )
}

/** Frostbite: ice crystal shards along the top and ends, icicles hanging from the bottom, glinting. */
function IceBorder({ size }: { size: Size }) {
  const spots = outline(bySize(size, 6, 9, 12), bySize(size, 5, 8, 11), bySize(size, 3, 4, 5))
  return (
    <Around
      spots={spots}
      turn={(s, i) => 90 - s.angle + (rand(i + 13) - 0.5) * 14}
      piece={(s, i) => {
        const length = s.where === 'bottom' ? 0.9 + rand(i + 2) * 0.7 : 0.55 + rand(i + 2) * 0.5
        return (
          <span style={{ '--s': length.toFixed(2) } as CSSProperties}>
            <span className="np-shard" />
            {i % 4 === 1 && <span className="np-ice-glint" style={{ animationDelay: `${(rand(i + 9) * 2.4).toFixed(2)}s` }} />}
          </span>
        )
      }}
    />
  )
}

// Thunder: three jagged versions of the outline take turns flashing, so the whole border crackles.
// Each version is lit 40% of a 1.8 s cycle and they start ⅓ apart, so at least one is always crackling.
const ARCS = [0, 1, 2].map((v) => ({ seed: v * 17 + 3, delay: v * 0.6 }))

/** A jagged line along a straight edge (viewBox 0 0 100 20, the edge at y = 10). */
function jaggedLine(seed: number, segments = 9) {
  const points = Array.from({ length: segments + 1 }, (_, k) => {
    const y = k === 0 || k === segments ? 10 : 10 + (rand(seed * 31 + k) - 0.5) * 15
    return `${((k / segments) * 100).toFixed(1)} ${y.toFixed(1)}`
  })
  return `M${points.join(' L')}`
}

/** A jagged half circle around one end (viewBox 0 0 50 100: the end's box, radius 50). */
function jaggedEnd(seed: number, side: 'left' | 'right', segments = 6) {
  const points = Array.from({ length: segments + 1 }, (_, k) => {
    const angle = side === 'left' ? 90 + (180 * k) / segments : 90 - (180 * k) / segments
    const rad = (angle * Math.PI) / 180
    const r = k === 0 || k === segments ? 50 : 50 + (rand(seed * 17 + k) - 0.5) * 18
    const cx = side === 'left' ? 50 : 0
    return `${(cx + r * Math.cos(rad)).toFixed(1)} ${(50 - r * Math.sin(rad)).toFixed(1)}`
  })
  return `M${points.join(' L')}`
}

function Arc({ d, viewBox, className, delay, width }: { d: string; viewBox: string; className: string; delay: number; width: number }) {
  return (
    <svg className={clsx('np-arc', className)} viewBox={viewBox} preserveAspectRatio="none" style={{ animationDelay: `${delay}s` }}>
      <path d={d} className="np-arc-glow" strokeWidth={width * 2.8} />
      <path d={d} className="np-arc-core" strokeWidth={width} />
    </svg>
  )
}

/** Thunder: the border is lightning, crackling all the way around. */
function LightningBorder({ size }: { size: Size }) {
  const width = bySize(size, 1.1, 1.5, 2.1)
  return (
    <span className="np-perim" aria-hidden>
      <span className="np-end">
        {ARCS.map((a) => (
          <Arc key={a.seed} d={jaggedEnd(a.seed, 'left')} viewBox="0 0 50 100" className="np-arc-end" delay={a.delay} width={width} />
        ))}
      </span>
      <span className="np-mid">
        {ARCS.map((a) => (
          <Fragment key={a.seed}>
            <Arc d={jaggedLine(a.seed + 1)} viewBox="0 0 100 20" className="np-arc-top" delay={a.delay} width={width} />
            <Arc d={jaggedLine(a.seed + 2)} viewBox="0 0 100 20" className="np-arc-bottom" delay={a.delay} width={width} />
          </Fragment>
        ))}
      </span>
      <span className="np-end">
        {ARCS.map((a) => (
          <Arc key={a.seed} d={jaggedEnd(a.seed + 5, 'right')} viewBox="0 0 50 100" className="np-arc-end" delay={a.delay} width={width} />
        ))}
      </span>
    </span>
  )
}

/** Galaxy: a comet orbiting the border, with stars twinkling around it. */
function CosmicBorder({ size }: { size: Size }) {
  const spots = outline(bySize(size, 4, 6, 8), bySize(size, 3, 5, 7), bySize(size, 2, 3, 4))
  return (
    <>
      <span className="np-comet" aria-hidden>
        <span className="np-comet-spin" />
      </span>
      <Around
        spots={spots}
        piece={(_, i) => (
          <span
            className="np-star-dust"
            style={{ animationDelay: `${(rand(i + 4) * 2.4).toFixed(2)}s`, '--d': `${(0.12 + rand(i + 8) * 0.22).toFixed(2)}em` } as CSSProperties}
          />
        )}
      />
    </>
  )
}

/** Golden Crown: a thick gold frame studded with beads, a crown on top and rubies on the ends. */
function GoldBorder({ size }: { size: Size }) {
  const spots = outline(bySize(size, 5, 8, 11), bySize(size, 5, 8, 11), bySize(size, 2, 3, 4))
  return (
    <>
      <Around spots={spots} piece={() => <span className="np-bead" />} />
      <Crown />
      <span className="np-jewel np-jewel-l" aria-hidden />
      <span className="np-jewel np-jewel-r" aria-hidden />
    </>
  )
}

function Crown() {
  const ids = useSvgIds('gold')
  const gold = `url(#${ids.gold})`
  return (
    <svg className="np-crown" viewBox="0 0 40 30" aria-hidden>
      <defs>
        <linearGradient id={ids.gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FEF3C7" />
          <stop offset="0.45" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#92400E" />
        </linearGradient>
      </defs>
      <path d="M4 25 L6 9 L13.5 16.5 L20 4 L26.5 16.5 L34 9 L36 25 Z" fill={gold} stroke="#FFFBEB" strokeWidth="0.8" strokeLinejoin="round" />
      <rect x="4" y="23.5" width="32" height="4.5" rx="1.5" fill={gold} stroke="#FFFBEB" strokeWidth="0.6" />
      <circle cx="20" cy="4" r="2.5" fill="#F43F5E" stroke="#FFE4E6" strokeWidth="0.5" />
      <circle cx="6" cy="9" r="1.9" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="0.5" />
      <circle cx="34" cy="9" r="1.9" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="0.5" />
      <circle cx="20" cy="25.8" r="1.4" fill="#F43F5E" />
    </svg>
  )
}

/** Sweetheart: little hearts all around the border, beating one after another. */
function HeartsBorder({ size }: { size: Size }) {
  const spots = outline(bySize(size, 5, 8, 11), bySize(size, 5, 8, 11), bySize(size, 2, 3, 4))
  return (
    <Around
      spots={spots}
      turn={(_, i) => (rand(i + 21) - 0.5) * 24}
      piece={(_, i) => <span className={clsx('np-heart', i % 3 === 0 && 'np-heart-big')} style={{ animationDelay: `${((i * 0.18) % 1.2).toFixed(2)}s` }} />}
    />
  )
}

/** Butterfly Dream: butterflies resting on the edge, flapping, plus one fluttering around the tag. */
function ButterflyBorder({ size }: { size: Size }) {
  const spots = outline(bySize(size, 2, 3, 4), bySize(size, 1, 2, 3), 1)
  const colors = ['#F0ABFC', '#7DD3FC', '#F9A8D4', '#C4B5FD']
  return (
    <>
      <Around
        spots={spots}
        turn={(s, i) => (90 - s.angle) * 0.6 + (rand(i + 2) - 0.5) * 30}
        piece={(_, i) => <Butterfly color={colors[i % colors.length]} delay={rand(i + 6) * 0.6} />}
      />
      <span className="np-flutter" aria-hidden>
        <Butterfly color="#FDE68A" delay={0.2} />
      </span>
    </>
  )
}

function Butterfly({ color, delay }: { color: string; delay: number }) {
  return (
    <span className="np-fly">
      <svg viewBox="0 0 24 20" className="np-fly-wings" style={{ animationDelay: `${delay.toFixed(2)}s` }}>
        <path d="M12 10 C7 0 0 1 1.5 7 C2.5 11 7 11 12 10 Z M12 10 C17 0 24 1 22.5 7 C21.5 11 17 11 12 10 Z" fill={color} stroke="#FFFFFF" strokeWidth="0.8" />
        <path d="M12 10 C8 12 3 14 4.5 17.5 C6.5 19.5 10 15 12 10 Z M12 10 C16 12 21 14 19.5 17.5 C17.5 19.5 14 15 12 10 Z" fill={color} opacity="0.75" stroke="#FFFFFF" strokeWidth="0.8" />
        <circle cx="6" cy="6" r="1.4" fill="#FFFFFF" opacity="0.8" />
        <circle cx="18" cy="6" r="1.4" fill="#FFFFFF" opacity="0.8" />
        <rect x="11.2" y="5" width="1.6" height="11" rx="0.8" fill="#3B0764" />
      </svg>
    </span>
  )
}

/** Rose Garden: a green vine border with roses blooming on it and leaves between them. */
function RoseBorder({ size }: { size: Size }) {
  const spots = outline(bySize(size, 7, 10, 14), bySize(size, 6, 9, 13), bySize(size, 3, 4, 5))
  return (
    <Around
      spots={spots}
      turn={(s, i) => 90 - s.angle + (rand(i + 15) - 0.5) * 30}
      piece={(s, i) =>
        i % 2 === 0 || s.where === 'end' ? (
          <span className={clsx('np-rose', i % 4 === 0 && 'np-rose-big')} style={{ animationDelay: `-${(rand(i + 3) * 3).toFixed(2)}s` }}>
            <svg viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="9" fill={i % 3 ? '#E11D48' : '#F43F5E'} />
              <path d="M10 3.5 C14.5 3.5 16.5 8 14 11 C12 13.5 7.5 12.5 7.5 9.5 C7.5 7.5 10 6.5 11.5 8 M4 9 C4 14 8 17 12 16.5 M5.5 5.5 C3 9 6 13.5 9.5 14" stroke="#881337" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <circle cx="7" cy="6.5" r="1.6" fill="#FFE4E6" opacity="0.5" />
            </svg>
          </span>
        ) : (
          <span className="np-leaf" />
        )
      }
    />
  )
}

/** Princess Tiara: a string of pearls all around, a jewelled tiara on top and diamonds on the ends. */
function TiaraBorder({ size }: { size: Size }) {
  const spots = outline(bySize(size, 7, 11, 15), bySize(size, 7, 11, 15), bySize(size, 3, 4, 5))
  return (
    <>
      <Around spots={spots} piece={(_, i) => <span className={clsx('np-pearl', i % 2 === 1 && 'np-pearl-pink')} />} />
      <Tiara />
      <span className="np-diamond np-diamond-l" aria-hidden />
      <span className="np-diamond np-diamond-r" aria-hidden />
    </>
  )
}

function Tiara() {
  const ids = useSvgIds('tiara')
  const silver = `url(#${ids.tiara})`
  return (
    <svg className="np-tiara" viewBox="0 0 48 28" aria-hidden>
      <defs>
        <linearGradient id={ids.tiara} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#E2E8F0" />
          <stop offset="1" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
      <path d="M3 25 Q6 15 12 14 Q14 8 18 9 Q20 2 24 1.5 Q28 2 30 9 Q34 8 36 14 Q42 15 45 25 Q24 20 3 25 Z" fill={silver} stroke="#FFFFFF" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M8 22 Q12 17 15 18 M40 22 Q36 17 33 18 M19 15 Q24 11 29 15" stroke="#CBD5E1" strokeWidth="0.9" fill="none" />
      <path d="M24 13.5 C19.5 10 19.5 5.5 22 5 C23 4.8 23.8 5.5 24 6.4 C24.2 5.5 25 4.8 26 5 C28.5 5.5 28.5 10 24 13.5 Z" fill="#EC4899" stroke="#FFE4F3" strokeWidth="0.7" />
      <circle cx="12" cy="14" r="1.8" fill="#C084FC" stroke="#FFFFFF" strokeWidth="0.5" />
      <circle cx="36" cy="14" r="1.8" fill="#C084FC" stroke="#FFFFFF" strokeWidth="0.5" />
      <circle cx="18" cy="9" r="1.3" fill="#F9A8D4" />
      <circle cx="30" cy="9" r="1.3" fill="#F9A8D4" />
      <circle cx="24" cy="1.8" r="1.4" fill="#FFFFFF" />
    </svg>
  )
}
