import type { AuraVisual } from '../../../cosmetics/visuals'

// Character auras in full-body coordinates (character centred on x = 80, feet at y ≈ 202).

export interface AuraIds {
  aura: string
  auraBlur: string
}

export function AuraDefs({ aura, ids }: { aura: AuraVisual; ids: AuraIds }) {
  return (
    <>
      <radialGradient id={ids.aura} cx="50%" cy="55%" r="50%">
        <stop offset="0%" stopColor={aura.color} stopOpacity="0" />
        <stop offset="55%" stopColor={aura.color} stopOpacity="0.06" />
        <stop offset="82%" stopColor={aura.color} stopOpacity="0.4" />
        <stop offset="100%" stopColor={aura.color} stopOpacity="0" />
      </radialGradient>
      <filter id={ids.auraBlur} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      {/* Rays fade out toward their tips */}
      <linearGradient id={`${ids.aura}r`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor={aura.accent} stopOpacity="0.55" />
        <stop offset="1" stopColor={aura.accent} stopOpacity="0" />
      </linearGradient>
      <filter id={`${ids.auraBlur}s`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.4" />
      </filter>
    </>
  )
}

/** Everything behind the character: halo, orbits or rays, and the ground ring. */
export function AuraBack({ aura, ids }: { aura: AuraVisual; ids: AuraIds }) {
  return (
    <g>
      <ellipse cx={80} cy={112} rx={78} ry={104} fill={`url(#${ids.aura})`} className="cd-glow" />
      {aura.kind === 'orbit' && <OrbitBack aura={aura} blurId={ids.auraBlur} />}
      {aura.kind === 'celestial' && <Celestial aura={aura} blurId={ids.auraBlur} />}
      {aura.kind === 'phoenix' && <Phoenix aura={aura} blurId={ids.auraBlur} />}
      {aura.kind === 'nova' && <NovaRays aura={aura} rayId={`${ids.aura}r`} softId={`${ids.auraBlur}s`} />}
      {aura.kind === 'flame' && <Flames aura={aura} blurId={ids.auraBlur} />}
      {aura.kind === 'spark' && <Bolts aura={aura} blurId={ids.auraBlur} />}
      <GroundRing aura={aura} blurId={ids.auraBlur} />
      {aura.kind === 'orbit' && <FloorRune aura={aura} />}
    </g>
  )
}

/** Sparkles drifting up in front of the character. */
export function AuraFront({ aura }: { aura: AuraVisual }) {
  const dots: [number, number, number, number][] = [
    [34, 170, 1.8, 0], [126, 160, 2.2, 0.6], [46, 120, 1.5, 1.1], [116, 118, 1.7, 1.6],
    [28, 140, 1.4, 2.0], [132, 136, 1.4, 0.3], [62, 186, 1.6, 1.3], [100, 182, 1.6, 2.2],
  ]
  return (
    <g fill={aura.accent}>
      {aura.kind === 'orbit' && <OrbitFront aura={aura} />}
      {dots.map(([x, y, r, delay]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} className="cd-rise" style={{ animationDelay: `${delay}s` }} />
      ))}
    </g>
  )
}

function GroundRing({ aura, blurId }: { aura: AuraVisual; blurId: string }) {
  return (
    <g>
      <ellipse cx={80} cy={202} rx={54} ry={11.5} fill={aura.color} opacity={0.18} />
      <ellipse cx={80} cy={202} rx={54} ry={11.5} fill="none" stroke={aura.color} strokeWidth={4} filter={`url(#${blurId})`} className="cd-glow" />
      <ellipse cx={80} cy={202} rx={54} ry={11.5} fill="none" stroke={aura.accent} strokeWidth={1.2} opacity={0.9} />
      {aura.kind === 'pulse' && (
        <g className="cd-glow">
          <ellipse cx={80} cy={202} rx={40} ry={8} fill="none" stroke={aura.color} strokeWidth={1.4} opacity={0.6} />
        </g>
      )}
    </g>
  )
}

/** Champion: two tilted gold orbits with a light travelling on each, and a glow behind the head. */
const ORBITS = [
  { tilt: -16, dur: '3.2s' },
  { tilt: 16, dur: '4.1s' },
]
const ORBIT_RX = 66
const ORBIT_RY = 15
/** One full turn of the orbit ellipse, starting at the front, for the travelling light. */
const ORBIT_PATH = `M0 ${ORBIT_RY} A${ORBIT_RX} ${ORBIT_RY} 0 1 1 0 ${-ORBIT_RY} A${ORBIT_RX} ${ORBIT_RY} 0 1 1 0 ${ORBIT_RY}`

const SHIMMER: [number, number, number, string][] = [
  [18, 50, 1, ''], [142, 70, 0.8, 'cd-d1'], [10, 120, 0.7, 'cd-d2'], [150, 140, 1, 'cd-d3'], [40, 20, 0.6, 'cd-d2'], [124, 24, 0.7, ''],
]

/** The big glow shared by the top auras (as on the Flame aura): a halo, a floor pool and a light pillar. */
function Radiance({ color, pool, blurId }: { color: string; pool: string; blurId: string }) {
  return (
    <g>
      <ellipse cx={80} cy={130} rx={86} ry={80} fill={color} opacity={0.18} filter={`url(#${blurId})`} />
      <ellipse cx={80} cy={204} rx={70} ry={13} fill={pool} opacity={0.35} filter={`url(#${blurId})`} />
      {SHIMMER.map(([x, y, k, d]) => (
        <path key={`${x}-${y}`} d={STAR} transform={`translate(${x} ${y}) scale(${k})`} fill="#FFFFFF" className={`cd-twinkle ${d}`} />
      ))}
    </g>
  )
}

function OrbitBack({ aura, blurId }: { aura: AuraVisual; blurId: string }) {
  return (
    <g>
      <Radiance color={aura.color} pool={aura.accent} blurId={blurId} />
      <ellipse cx={80} cy={58} rx={40} ry={34} fill={aura.accent} opacity={0.22} filter={`url(#${blurId})`} />
      {ORBITS.map(({ tilt }) => (
        <g key={tilt} transform={`translate(80 166) rotate(${tilt})`}>
          {/* Back half of the ring (behind the character) */}
          <path d={`M${-ORBIT_RX} 0 A${ORBIT_RX} ${ORBIT_RY} 0 0 1 ${ORBIT_RX} 0`} stroke={aura.color} strokeWidth={4} fill="none" opacity={0.5} filter={`url(#${blurId})`} />
          <path d={`M${-ORBIT_RX} 0 A${ORBIT_RX} ${ORBIT_RY} 0 0 1 ${ORBIT_RX} 0`} stroke={aura.accent} strokeWidth={1} fill="none" opacity={0.85} />
        </g>
      ))}
    </g>
  )
}

function OrbitFront({ aura }: { aura: AuraVisual }) {
  return (
    <g>
      {ORBITS.map(({ tilt, dur }) => (
        <g key={tilt} transform={`translate(80 166) rotate(${tilt})`}>
          {/* Front half of the ring, over the character */}
          <path d={`M${ORBIT_RX} 0 A${ORBIT_RX} ${ORBIT_RY} 0 0 1 ${-ORBIT_RX} 0`} stroke={aura.color} strokeWidth={3} fill="none" opacity={0.3} />
          <path d={`M${ORBIT_RX} 0 A${ORBIT_RX} ${ORBIT_RY} 0 0 1 ${-ORBIT_RX} 0`} stroke={aura.accent} strokeWidth={1.1} fill="none" opacity={0.95} />
          <g>
            <circle r={6} fill={aura.accent} opacity={0.3} />
            <circle r={2.2} fill="#FFFFFF" />
            <animateMotion dur={dur} repeatCount="indefinite" path={ORBIT_PATH} />
          </g>
        </g>
      ))}
    </g>
  )
}

/** A rotating rune circle on the floor (dashes flowing around the ground ring). */
function FloorRune({ aura }: { aura: AuraVisual }) {
  return (
    <g fill="none" stroke={aura.accent}>
      <ellipse cx={80} cy={202} rx={44} ry={9} strokeWidth={1.4} strokeDasharray="5 4" opacity={0.85} className="cd-dash" />
      <ellipse cx={80} cy={202} rx={62} ry={13} strokeWidth={0.8} opacity={0.6} />
    </g>
  )
}

/** Celestial: a crescent moon over the head, a slowly turning ring of stars and a constellation. */
const STAR = 'M0 -5 L1.3 -1.3 L5 0 L1.3 1.3 L0 5 L-1.3 1.3 L-5 0 L-1.3 -1.3 Z'
function Celestial({ aura, blurId }: { aura: AuraVisual; blurId: string }) {
  const ring = Array.from({ length: 14 }, (_, i) => {
    const t = (i / 14) * Math.PI * 2
    return [Math.cos(t) * 74, Math.sin(t) * 96, i % 3 === 0 ? 1.2 : 0.7] as const
  })
  return (
    <g>
      <Radiance color={aura.color} pool="#9BD1FF" blurId={blurId} />
      <ellipse cx={46} cy={70} rx={50} ry={34} fill="#3D6FE0" opacity={0.4} filter={`url(#${blurId})`} />
      <ellipse cx={116} cy={130} rx={46} ry={32} fill="#8B5CF6" opacity={0.35} filter={`url(#${blurId})`} />
      <g transform="translate(80 112)">
        <g className="cd-spin">
          {ring.map(([x, y, k], i) => (
            <path key={i} d={STAR} transform={`translate(${x} ${y}) scale(${k * 1.15})`} fill={i % 2 ? aura.accent : '#FFFFFF'} />
          ))}
        </g>
      </g>
      <path d="M24 60 L40 44 L58 52 M102 52 L120 44 L136 60" stroke={aura.accent} strokeWidth={0.8} fill="none" opacity={0.6} />
      {[[24, 60], [40, 44], [58, 52], [102, 52], [120, 44], [136, 60]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} fill="#FFFFFF" className={`cd-twinkle ${['', 'cd-d1', 'cd-d2', 'cd-d3'][i % 4]}`} />
      ))}
      <g transform="translate(80 12)">
        <circle r={20} fill={aura.accent} opacity={0.55} filter={`url(#${blurId})`} className="cd-glow" />
        <path d="M4 -11 A11 11 0 1 0 4 11 A8.5 8.5 0 1 1 4 -11 Z" fill={aura.accent} />
      </g>
    </g>
  )
}

/** Phoenix: a slowly turning ring of fire behind the character, white-hot at the centre. */
function Phoenix({ aura, blurId }: { aura: AuraVisual; blurId: string }) {
  return (
    <g>
      <Radiance color="#FF4D1A" pool={aura.color} blurId={blurId} />
      <g transform="translate(80 110)">
        <circle r={62} fill={aura.color} opacity={0.2} filter={`url(#${blurId})`} />
        <circle r={70} fill="none" stroke={aura.color} strokeWidth={5} opacity={0.6} filter={`url(#${blurId})`} />
        <g className="cd-spin">
          {Array.from({ length: 18 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 20}) translate(0 -70)`}>
              <g className={`cd-flick ${['', 'cd-d1', 'cd-d2', 'cd-d3'][i % 4]}`}>
                <path d={FLAME} transform="scale(0.85) rotate(180) translate(0 4)" fill={i % 3 === 0 ? '#FF4D1A' : i % 2 ? aura.accent : aura.color} />
                <path d={FLAME} transform="scale(0.4) rotate(180) translate(0 4)" fill="#FFF3C4" />
              </g>
            </g>
          ))}
        </g>
        <circle r={70} fill="none" stroke={aura.accent} strokeWidth={1.1} />
        <circle r={50} fill="none" stroke="#FFF3C4" strokeWidth={1.4} opacity={0.8} strokeDasharray="4 5" className="cd-dash" />
      </g>
    </g>
  )
}

function NovaRays({ aura, rayId, softId }: { aura: AuraVisual; rayId: string; softId: string }) {
  return (
    <g transform="translate(80 112)">
      <circle r={30} fill={aura.accent} opacity={0.25} filter={`url(#${softId})`} />
      <g className="cd-spin" filter={`url(#${softId})`}>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M0 0 Q-6 -48 -2.5 -96 Q0 -100 2.5 -96 Q6 -48 0 0 Z" transform={`rotate(${i * 30})`} fill={`url(#${rayId})`} />
        ))}
      </g>
    </g>
  )
}

const FLAME = 'M0 0 C-8 -6 -6 -18 0 -30 C2 -20 8 -16 6 -8 C10 -12 10 -18 8 -22 C14 -14 12 -2 0 0 Z'

type FlameSpot = [number, number, number, string] // x, y, scale, delay class

/** Flame: a hot glow, a wall of flames along the ground and tongues of fire licking up both sides. */
function Flames({ aura, blurId }: { aura: AuraVisual; blurId: string }) {
  const ground: FlameSpot[] = [
    [14, 204, 1.1, ''], [28, 208, 1.6, 'cd-d1'], [44, 210, 1.3, 'cd-d2'], [60, 212, 1.0, 'cd-d3'],
    [100, 212, 1.0, 'cd-d1'], [116, 210, 1.3, ''], [132, 208, 1.6, 'cd-d2'], [146, 204, 1.1, 'cd-d3'],
  ]
  const sides: FlameSpot[] = [
    [10, 170, 1.2, 'cd-d2'], [150, 170, 1.2, ''], [6, 132, 1.0, 'cd-d1'], [154, 132, 1.0, 'cd-d3'],
    [10, 96, 0.8, ''], [150, 96, 0.8, 'cd-d2'], [18, 62, 0.6, 'cd-d3'], [142, 62, 0.6, 'cd-d1'],
  ]
  const flame = ([x, y, s, delay]: FlameSpot) => (
    <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={`cd-flick ${delay}`}>
        <path d={FLAME} fill="#FF4D1A" opacity={0.75} filter={`url(#${blurId})`} transform="scale(1.35)" />
        <path d={FLAME} fill={aura.color} opacity={0.95} />
        <path d={FLAME} transform="scale(0.62) translate(0 -2)" fill={aura.accent} />
        <path d={FLAME} transform="scale(0.3) translate(0 -2)" fill="#FFFFFF" opacity={0.85} />
      </g>
    </g>
  )
  return (
    <g>
      <ellipse cx={80} cy={150} rx={86} ry={70} fill="#FF4D1A" opacity={0.22} filter={`url(#${blurId})`} className="cd-glow" />
      <ellipse cx={80} cy={204} rx={76} ry={16} fill={aura.color} opacity={0.5} filter={`url(#${blurId})`} />
      {sides.map(flame)}
      {ground.map(flame)}
    </g>
  )
}

const BOLTS = ['M22 70 l9 12 l-7 3 l11 15', 'M140 84 l-9 11 l7 3 l-10 15', 'M18 150 l10 8 l-6 4 l10 9', 'M144 150 l-10 8 l6 4 l-10 9']

/** Lightning: a soft coloured glow under a thin bright core. */
function Bolts({ aura, blurId }: { aura: AuraVisual; blurId: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round" className="cd-glow">
      <g stroke={aura.color} strokeWidth={6} opacity={0.7} filter={`url(#${blurId})`}>
        {BOLTS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g stroke={aura.accent} strokeWidth={1.6}>
        {BOLTS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </g>
  )
}
