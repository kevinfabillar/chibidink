import type { CharacterLook, Gear } from '../../cosmetics/visuals'
import { shade } from '../../lib/color'
import { useSvgIds } from '../../lib/svgIds'
import { faceShapes, handleWidth, withDefaults, wrapInk, type FaceShape } from './characterArt'
import { GearBack, GearBody, GearCape, GearHat, GearHeld, GearOffhand, Lute, type GearPaint } from './gearArt'
import { HairBack, HairFront } from './glamArt'
import { AuraBack, AuraDefs, AuraFront } from './parts/Aura'

export type Pose = 'idle' | 'swing' | 'victory'

interface Props {
  look: CharacterLook
  /** `bust` for court cards and lists; `full` for the character, home and item screens. */
  variant?: 'bust' | 'full'
  pose?: Pose
  /** Width in px. Omit to size with `className` (e.g. `w-full`). */
  size?: number
  /** Gentle idle float and wave. */
  animated?: boolean
  /** Mirror so Team B faces Team A. */
  flip?: boolean
  className?: string
  title?: string
}

// Viewboxes keep the same aspect ratios as before (Avatar3D and the 3D framings rely on them).
// Both leave room above the head for tall hats (the wizard hat tip reaches y ≈ -112).
const FULL_VIEW = { box: '-129 -130 858 900', ratio: 214 / 204 }
const BUST_VIEW = { box: '20 -124 560 616', ratio: 132 / 120 }
/** Auras are drawn in the old 204-wide stage; this maps them onto the new one. */
const AURA_FIT = `translate(-129 -110) scale(${858 / 204}) translate(22 2)`

/** Right arm angle (degrees, around the shoulder) per pose. 0 = raised, as in the design. */
const ARM_TURN: Record<Pose, number> = { idle: 0, swing: 40, victory: -12 }

const NECKWEAR: Gear[] = ['cowboy', 'ninja', 'viking', 'bard', 'void']

const ID_NAMES = ['shoe', 'body', 'grip', 'leg', 'steel', 'gold', 'blade', 'cape', 'shield', 'ball', 'blur', 'blur8', 'faceClip', 'face', 'aura', 'auraBlur'] as const

/**
 * The player's character: a living pickleball paddle (the "Sprout" design), drawn from
 * appearance + equipped gear. The 3D version is built from the same data.
 */
export function ChibiAvatar({ look, variant = 'bust', pose = 'idle', size, animated, flip, className, title }: Props) {
  const ids = useSvgIds(...ID_NAMES)
  const view = variant === 'full' ? FULL_VIEW : BUST_VIEW
  const a = withDefaults(look.appearance)
  const o = look.outfit
  const gear = o.gear
  const full = variant === 'full'
  const effect = full ? look.effect : null

  const body = a.bodyColor
  const hw = handleWidth(a.handleShape)
  const hx = 300 - hw / 2
  const paint: GearPaint = {
    steel: `url(#${ids.steel})`,
    gold: `url(#${ids.gold})`,
    blade: `url(#${ids.blade})`,
    ball: `url(#${ids.ball})`,
    blur: ids.blur,
    faceClip: ids.faceClip,
  }
  const face = faceShapes(a, gear)
  const mitten = gear === 'knight' ? paint.steel : (o.glove ?? '#F4F6F9')

  return (
    <svg
      viewBox={view.box}
      width={size}
      height={size ? size * view.ratio : undefined}
      className={className}
      style={{ ...(size ? null : { height: 'auto' }), ...(flip ? { transform: 'scaleX(-1)' } : null) }}
      role="img"
      aria-label={title ?? 'Player character'}
    >
      <defs>
        <radialGradient id={ids.body} cx="36%" cy="28%" r="80%">
          <stop offset="0" stopColor={shade(body, 0.45)} />
          <stop offset="0.55" stopColor={body} />
          <stop offset="1" stopColor={shade(body, -0.28)} />
        </radialGradient>
        <linearGradient id={ids.grip} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(a.gripColor, 0.25)} />
          <stop offset="0.4" stopColor={a.gripColor} />
          <stop offset="1" stopColor={shade(a.gripColor, -0.5)} />
        </linearGradient>
        <radialGradient id={ids.shoe} cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor={shade(o.shoes, 0.4)} />
          <stop offset="0.55" stopColor={o.shoes} />
          <stop offset="1" stopColor={shade(o.shoes, -0.35)} />
        </radialGradient>
        <radialGradient id={ids.leg} cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor="#5A6070" />
          <stop offset="1" stopColor="#22262F" />
        </radialGradient>
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
        {o.cape && (
          <linearGradient id={ids.cape} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={o.cape} />
            <stop offset="1" stopColor={o.capeTo ?? shade(o.cape, -0.5)} />
          </linearGradient>
        )}
        <radialGradient id={ids.shield} cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#4C6BA8" />
          <stop offset="0.6" stopColor="#2B4579" />
          <stop offset="1" stopColor="#172A50" />
        </radialGradient>
        <radialGradient id={ids.ball} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#F6FF9E" />
          <stop offset="0.55" stopColor="#D8EE3A" />
          <stop offset="1" stopColor="#9DB518" />
        </radialGradient>
        <filter id={ids.blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={ids.blur8} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <clipPath id={ids.faceClip}>
          <rect x="120" y="80" width="360" height="410" rx="150" />
        </clipPath>
        <FaceDefs shapes={face} prefix={ids.face} />
        {full && look.aura && <AuraDefs aura={look.aura} ids={{ aura: ids.aura, auraBlur: ids.auraBlur }} />}
      </defs>

      {full && look.aura && (
        <g transform={AURA_FIT}>
          <AuraBack aura={look.aura} ids={{ aura: ids.aura, auraBlur: ids.auraBlur }} />
        </g>
      )}
      {full && <ellipse cx="300" cy="748" rx="120" ry="18" fill="#000" opacity="0.35" filter={`url(#${ids.blur8})`} />}

      <g className={animated ? 'cd-bob' : undefined}>
        <GearBack gear={gear} premium={full ? o.premium : undefined} />
        <GearCape gear={gear} color={o.cape} gradient={`url(#${ids.cape})`} />
        {o.hair && <HairBack hair={o.hair} />}

        <rect x="266" y="620" width="28" height="92" rx="14" fill={`url(#${ids.leg})`} />
        <rect x="306" y="620" width="28" height="92" rx="14" fill={`url(#${ids.leg})`} />
        {gear === 'knight' ? (
          <g>
            <path d="M240 724 Q240 690 268 690 Q300 690 304 724 Q272 738 240 724 Z" fill={paint.steel} />
            <path d="M296 724 Q300 690 332 690 Q360 690 360 724 Q328 738 296 724 Z" fill={paint.steel} />
            <path d="M248 700 L298 700 M302 700 L352 700" stroke={paint.gold} strokeWidth="5" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <ellipse cx="272" cy="716" rx="34" ry="21" fill={`url(#${ids.shoe})`} />
            <ellipse cx="328" cy="716" rx="34" ry="21" fill={`url(#${ids.shoe})`} />
            <ellipse cx="262" cy="708" rx="14" ry="6" fill="#FFFFFF" opacity="0.6" />
            <ellipse cx="318" cy="708" rx="14" ry="6" fill="#FFFFFF" opacity="0.6" />
            <path d="M240 722 Q272 742 304 722 M296 722 Q328 742 360 722" stroke={o.sole ?? shade(body, -0.28)} strokeWidth="5" fill="none" strokeLinecap="round" />
          </g>
        )}

        <Handle hx={hx} hw={hw} grip={`url(#${ids.grip})`} wrap={a.gripWrap} ink={wrapInk(a.gripColor)} cap={a.endCap} gold={paint.gold} ball={paint.ball} />
        {/* Neckwear (the cowboy's bandana, the ninja's scarf) goes over the neck, so it's drawn after it */}
        <GearBody gear={NECKWEAR.includes(gear) ? 'none' : gear} hx={hx} hw={hw} p={paint} />
        <path d="M246 470 Q300 486 354 470 L340 508 Q300 516 260 508 Z" fill={shade(body, -0.28)} />
        {NECKWEAR.includes(gear) && <GearBody gear={gear} hx={hx} hw={hw} p={paint} />}

        {/* Left arm */}
        <rect x="-18" y="0" width="36" height="90" rx="18" fill={`url(#${ids.body})`} transform="translate(130 352) rotate(30)" />
        {gear === 'bard' && <Lute />}
        {gear !== 'knight' && <circle cx="85" cy="430" r="21" fill={mitten} />}

        {/* Right arm: waves, or holds the outfit's item */}
        <g transform={`rotate(${ARM_TURN[pose]} 470 352)`}>
          <g className={animated && pose === 'idle' ? 'cd-wave' : undefined}>
            <rect x="-18" y="0" width="36" height="90" rx="18" fill={`url(#${ids.body})`} transform="translate(470 352) rotate(-130)" />
            {full && <GearHeld gear={gear} p={paint} effect={effect} />}
            <circle cx="539" cy="294" r="21" fill={mitten} />
            <circle cx="528" cy="276" r="8" fill={mitten} />
          </g>
        </g>

        {/* The paddle face (head) */}
        <rect x="120" y="80" width="360" height="410" rx="150" fill={`url(#${ids.body})`} stroke={a.edgeColor} strokeWidth="14" />
        <path d="M150 420 Q300 330 450 400" stroke={shade(body, 0.45)} strokeWidth="26" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M180 150 Q230 108 300 102" stroke="#FFFFFF" strokeWidth="16" fill="none" strokeLinecap="round" opacity="0.4" filter={`url(#${ids.blur})`} />
        <FaceArt shapes={face} prefix={ids.face} />
        {o.hair && <HairFront hair={o.hair} />}
        <GearHat gear={gear} p={paint} />

        <GearOffhand gear={gear} p={paint} shield={`url(#${ids.shield})`} effect={effect} />
      </g>

      {full && look.aura && (
        <g transform={AURA_FIT}>
          <AuraFront aura={look.aura} />
        </g>
      )}
    </svg>
  )
}

function Handle({ hx, hw, grip, wrap, ink, cap, gold, ball }: { hx: number; hw: number; grip: string; wrap: string; ink: string; cap: string; gold: string; ball: string }) {
  const x0 = hx + 3
  const x1 = hx + hw - 3
  let d = ''
  if (wrap === 'diagonal' || wrap === 'cross') for (const y of [560, 590, 620]) d += `M${x0} ${y} L${x1} ${y - 22} `
  if (wrap === 'cross') for (const y of [560, 590, 620]) d += `M${x0} ${y - 22} L${x1} ${y} `
  if (wrap === 'stripes') for (const y of [550, 572, 594, 616]) d += `M${x0} ${y} L${x1} ${y} `
  return (
    <g>
      <rect x={hx} y="468" width={hw} height="180" rx={Math.min(24, Math.round(hw / 3))} fill={grip} />
      {d && <path d={d} stroke={ink} strokeWidth={wrap === 'stripes' ? 6 : 3} fill="none" strokeLinecap="round" opacity="0.22" />}
      {cap === 'pommel' ? (
        <g>
          <rect x={hx - 6} y="634" width={hw + 12} height="26" rx="8" fill={gold} />
          <circle cx="300" cy="647" r="6" fill="#D93A45" />
        </g>
      ) : cap === 'ball' ? (
        <g>
          <circle cx="300" cy="654" r="20" fill={ball} />
          <g fill="#8AA012">
            <circle cx="292" cy="648" r="3" />
            <circle cx="306" cy="650" r="3" />
            <circle cx="298" cy="662" r="3" />
          </g>
        </g>
      ) : (
        <rect x={hx - 6} y="636" width={hw + 12} height="22" rx="11" fill="#1A1D24" />
      )}
    </g>
  )
}

// ---- Face (shared shapes, see characterArt.ts) ----------------------------------------------------

function FaceDefs({ shapes, prefix }: { shapes: FaceShape[]; prefix: string }) {
  return (
    <>
      {shapes.map((s, i) => {
        if (s.kind === 'blush')
          return (
            <radialGradient key={i} id={`${prefix}${i}`}>
              <stop offset="0" stopColor={s.color} />
              <stop offset="1" stopColor={s.color} stopOpacity="0" />
            </radialGradient>
          )
        if (s.fill && typeof s.fill !== 'string')
          return (
            <linearGradient key={i} id={`${prefix}${i}`} gradientUnits="userSpaceOnUse" x1="0" y1={s.fill.y0} x2="0" y2={s.fill.y1}>
              {s.fill.stops.map(([o, c]) => (
                <stop key={o} offset={o} stopColor={c} />
              ))}
            </linearGradient>
          )
        return null
      })}
    </>
  )
}

function FaceArt({ shapes, prefix }: { shapes: FaceShape[]; prefix: string }) {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      {shapes.map((s, i) =>
        s.kind === 'blush' ? (
          <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={`url(#${prefix}${i})`} opacity={s.opacity} />
        ) : (
          <path
            key={i}
            d={s.d}
            fill={s.fill === undefined ? 'none' : typeof s.fill === 'string' ? s.fill : `url(#${prefix}${i})`}
            fillRule={s.evenodd ? 'evenodd' : undefined}
            stroke={s.stroke}
            strokeWidth={s.width}
            opacity={s.opacity}
          />
        ),
      )}
    </g>
  )
}
