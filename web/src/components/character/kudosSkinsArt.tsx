import type { Gear } from '../../cosmetics/visuals'
import { edgeX, headTop } from './characterArt'
import type { GearPaint } from './gearArt'

// The second wave of achievement skins in 2D, one for each remaining kind of kudos:
// Jade Sage (Dinks), Starfall Archer (Drops), Volt Striker (Speed-ups), Meteor Titan (Smashes),
// Laurel Olympian (Good sport), Soulbound (Great partner) and Cheer Captain (Fun to play with).
// Same design coordinates as achievementArt.tsx: head x 120..480, y 80..490, raised hand at 539,294,
// other hand at 85,430. The 3D versions are in character3d/kudosSkins.ts.

export const KUDOS_SKIN_GEARS = ['sage', 'archer', 'volt', 'titan', 'olympian', 'soulbound', 'cheer'] as const
export type KudosSkinGear = (typeof KUDOS_SKIN_GEARS)[number]

/** Where the held item's effect glows: [cx, cy, rx, ry]. */
export const KUDOS_SKIN_GLOW: Record<KudosSkinGear, [number, number, number, number]> = {
  sage: [539, 190, 76, 60],
  archer: [566, 290, 46, 150],
  volt: [539, 196, 60, 60],
  titan: [540, 114, 100, 70],
  olympian: [539, 120, 46, 64],
  soulbound: [539, 184, 56, 64],
  cheer: [539, 236, 72, 72],
}

/** Steady pseudo-random 0–1, so confetti and stars sit in the same places on every render. */
const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

const star = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`
  }).join(' ') + ' Z'

const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + s * 0.9} C${cx - s * 1.4} ${cy} ${cx - s * 0.9} ${cy - s} ${cx} ${cy - s * 0.35} C${cx + s * 0.9} ${cy - s} ${cx + s * 1.4} ${cy} ${cx} ${cy + s * 0.9} Z`

/** A lightning bolt from (x, y) going down, `h` tall. */
const bolt = (x: number, y: number, h: number, flip = 1) =>
  `M${x} ${y} L${x - 22 * flip} ${y + h * 0.45} L${x + 2 * flip} ${y + h * 0.45} L${x - 16 * flip} ${y + h} L${x + 30 * flip} ${y + h * 0.38} L${x + 6 * flip} ${y + h * 0.38} L${x + 20 * flip} ${y} Z`

/** A laurel branch: leaves along a quadratic curve from (x0, y0) through (cx, cy) to (x1, y1). */
function Laurel({ x0, y0, cx, cy, x1, y1, n, size, fill, stroke }: { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number; n: number; size: number; fill: string; stroke: string }) {
  return (
    <g>
      <path d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`} stroke={stroke} strokeWidth="4" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n
        const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1
        const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1
        const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx)
        const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy)
        const a = (Math.atan2(dy, dx) * 180) / Math.PI
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(1)})`}>
            <path d={`M0 0 Q${size * 0.7} ${-size * 0.9} ${size * 1.5} ${-size * 0.5} Q${size * 0.7} ${-size * 0.1} 0 0 Z`} fill={fill} stroke={stroke} strokeWidth="1.5" />
            <path d={`M0 0 Q${size * 0.7} ${size * 0.9} ${size * 1.5} ${size * 0.5} Q${size * 0.7} ${size * 0.1} 0 0 Z`} fill={fill} stroke={stroke} strokeWidth="1.5" />
          </g>
        )
      })}
    </g>
  )
}

/** A soft feather pointing up from (x, y), `h` long, tilted `deg`. */
function Feather({ x, y, h, deg, fill, vein }: { x: number; y: number; h: number; deg: number; fill: string; vein: string }) {
  return (
    <g transform={`rotate(${deg} ${x} ${y})`}>
      <path d={`M${x} ${y} Q${x - h * 0.26} ${y - h * 0.55} ${x} ${y - h} Q${x + h * 0.26} ${y - h * 0.55} ${x} ${y} Z`} fill={fill} stroke={vein} strokeWidth="2" />
      <path d={`M${x} ${y + h * 0.12} L${x} ${y - h * 0.92}`} stroke={vein} strokeWidth="2.5" strokeLinecap="round" />
      {[0.3, 0.5, 0.7].map((k) => (
        <path key={k} d={`M${x} ${y - h * k} l${-h * 0.1} ${h * 0.08} M${x} ${y - h * k} l${h * 0.1} ${h * 0.08}`} stroke={vein} strokeWidth="1.5" opacity="0.7" />
      ))}
    </g>
  )
}

/** A lotus flower centred on (cx, cy). */
function Lotus({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <g stroke="#047857" strokeWidth="2" strokeLinejoin="round">
      {[-60, -32, 32, 60].map((deg) => (
        <path key={deg} d={`M${cx} ${cy} Q${cx - s * 0.5} ${cy - s * 0.8} ${cx} ${cy - s * 1.5} Q${cx + s * 0.5} ${cy - s * 0.8} ${cx} ${cy} Z`} fill="#A7F3D0" transform={`rotate(${deg} ${cx} ${cy})`} />
      ))}
      <path d={`M${cx} ${cy} Q${cx - s * 0.55} ${cy - s} ${cx} ${cy - s * 1.75} Q${cx + s * 0.55} ${cy - s} ${cx} ${cy} Z`} fill="#ECFDF5" />
      <ellipse cx={cx} cy={cy - s * 0.12} rx={s * 0.5} ry={s * 0.16} fill="#34D399" />
    </g>
  )
}

/** A pom-pom: a burst of glossy strands around (cx, cy). */
function PomPom({ cx, cy, r, shake }: { cx: number; cy: number; r: number; shake?: boolean }) {
  const n = 30
  const strands = (len: number, w: number, offset: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((i + offset) / n) * 360
      const l = len * (0.86 + rand(i + offset * 7 + 3) * 0.28)
      return <path key={`${offset}-${i}`} d={`M${cx - w * 0.4} ${cy} L${cx - w} ${cy - l} Q${cx} ${cy - l - w * 1.4} ${cx + w} ${cy - l} L${cx + w * 0.4} ${cy} Z`} fill={i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#F472B6' : '#EC4899'} transform={`rotate(${a.toFixed(1)} ${cx} ${cy})`} />
    })
  return (
    <g className={shake ? 'cd-shake' : undefined}>
      {strands(r, r * 0.2, 0)}
      {strands(r * 0.78, r * 0.18, 0.5)}
      <circle cx={cx} cy={cy} r={r * 0.5} fill="#F9A8D4" />
      <circle cx={cx - r * 0.15} cy={cy - r * 0.15} r={r * 0.18} fill="#FFFFFF" opacity="0.5" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={star(cx - r * 0.5 + i * r * 0.5, cy - r * 0.55 + (i % 2) * r * 0.25, 7)} fill="#FDE68A" className={`cd-twinkle cd-d${i + 1}`} />
      ))}
    </g>
  )
}

/** Each skin's own backdrop, drawn behind the premium glow. */
export function KudosSkinBackdrop({ gear }: { gear: Gear }) {
  switch (gear) {
    case 'sage':
      return (
        <g>
          {/* An ink-brush circle behind, the gap at the top right */}
          <path d="M470 220 A230 230 0 1 1 380 150" stroke="#10B981" strokeWidth="26" fill="none" strokeLinecap="round" opacity="0.28" />
          <path d="M470 220 A230 230 0 1 1 380 150" stroke="#6EE7B7" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.5" />
          {/* Lotus pond ripples at the feet */}
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx="300" cy="740" rx={110 + i * 46} ry={16 + i * 7} fill="none" stroke="#6EE7B7" strokeWidth={4 - i} opacity={0.6 - i * 0.15} className={`cd-glow cd-d${i + 1}`} />
          ))}
          <Lotus cx={128} cy={742} s={30} />
          <Lotus cx={474} cy={744} s={24} />
          {/* Feathers drifting down */}
          {[[90, 120, 0], [500, 90, 1], [150, 520, 2], [470, 470, 3]].map(([x, y, i]) => (
            <g key={i} className={`cd-fall cd-d${(i % 3) + 1}`}>
              <Feather x={x} y={y} h={58} deg={-30 + i * 20} fill="#D1FAE5" vein="#10B981" />
            </g>
          ))}
          {[[60, 300], [540, 360], [110, 640], [520, 620], [300, 30]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="9" fill="#34D399" opacity="0.7" className={`cd-twinkle cd-d${(i % 3) + 1}`} />
          ))}
        </g>
      )
    case 'archer':
      return (
        <g>
          {/* A target behind, its rings glowing */}
          {[250, 190, 130, 70].map((r, i) => (
            <circle key={r} cx="300" cy="390" r={r} fill="none" stroke={i % 2 ? '#7DD3FC' : '#38BDF8'} strokeWidth={i === 3 ? 10 : 5} opacity={0.22 + i * 0.08} />
          ))}
          <circle cx="300" cy="390" r="22" fill="#E0F2FE" opacity="0.4" className="cd-glow" />
          {/* Falling stars */}
          {[[520, 40], [420, 0], [600, 160], [250, -20]].map(([x, y], i) => (
            <g key={i} className="cd-meteor" style={{ animationDelay: `${i * 1.7}s` }}>
              <path d={`M${x} ${y} l70 -32`} stroke="#E0F2FE" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
              <path d={star(x, y, 13)} fill="#FFFFFF" />
            </g>
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={star(40 + rand(i) * 520, 40 + rand(i + 20) * 640, 6 + rand(i + 40) * 6)} fill="#BAE6FD" className={`cd-twinkle cd-d${(i % 3) + 1}`} />
          ))}
        </g>
      )
    case 'volt':
      return (
        <g>
          {/* A neon floor grid running to the horizon */}
          <g stroke="#FACC15" strokeWidth="2" opacity="0.4">
            {[640, 668, 700, 738].map((y) => (
              <path key={y} d={`M0 ${y} L600 ${y}`} />
            ))}
            {[-300, -150, 0, 150, 300, 450, 600, 750, 900].map((x) => (
              <path key={x} d={`M300 620 L${x} 770`} />
            ))}
          </g>
          {/* Big bolts crackling either side */}
          <g fill="#FDE047" stroke="#FEF9C3" strokeWidth="3" strokeLinejoin="round">
            <path d={bolt(84, 100, 230)} className="cd-twinkle" />
            <path d={bolt(520, 160, 200, -1)} className="cd-twinkle cd-d2" />
            <path d={bolt(60, 420, 150)} className="cd-twinkle cd-d3" opacity="0.8" />
            <path d={bolt(548, 440, 140, -1)} className="cd-twinkle cd-d1" opacity="0.8" />
          </g>
          <circle cx="300" cy="390" r="240" fill="none" stroke="#FACC15" strokeWidth="3" strokeDasharray="4 18" opacity="0.6" className="cd-spin" />
        </g>
      )
    case 'titan':
      return (
        <g>
          {/* Meteors streaking down */}
          {[[560, 20], [440, -30], [620, 200], [330, -60]].map(([x, y], i) => (
            <g key={i} className="cd-meteor" style={{ animationDelay: `${i * 1.6}s` }}>
              <path d={`M${x} ${y} l130 -58`} stroke="#F97316" strokeWidth="34" strokeLinecap="round" opacity="0.28" />
              <path d={`M${x} ${y} l100 -44`} stroke="#FB923C" strokeWidth="18" strokeLinecap="round" opacity="0.6" />
              <path d={`M${x} ${y} l60 -26`} stroke="#FDE68A" strokeWidth="8" strokeLinecap="round" />
              <path d={`M${x - 22} ${y + 4} L${x - 8} ${y - 20} L${x + 18} ${y - 16} L${x + 24} ${y + 8} L${x + 4} ${y + 24} Z`} fill="#3A1A12" stroke="#F97316" strokeWidth="5" strokeLinejoin="round" />
            </g>
          ))}
          {/* A cracked lava crater at the feet */}
          <ellipse cx="300" cy="742" rx="190" ry="28" fill="#2A0A06" opacity="0.7" />
          <path d="M140 742 L196 736 L220 750 L268 734 L300 748 L340 734 L372 750 L414 736 L462 744" stroke="#F97316" strokeWidth="5" fill="none" strokeLinejoin="round" className="cd-glow" />
          {[170, 230, 300, 370, 430].map((x, i) => (
            <path key={x} d={`M${x} 744 q-16 -34 0 -70 q16 36 0 70 Z`} fill={i % 2 ? '#FB923C' : '#F43F5E'} opacity="0.75" className="cd-flick" style={{ animationDelay: `${i * 0.13}s` }} />
          ))}
          {[[120, 560], [480, 600], [210, 640], [400, 520]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5" fill="#FDBA74" className={`cd-rise cd-d${(i % 3) + 1}`} />
          ))}
        </g>
      )
    case 'olympian':
      return (
        <g>
          {/* Golden rays */}
          <g opacity="0.2">
            {Array.from({ length: 16 }, (_, i) => (
              <path key={i} d="M300 400 L288 -40 L312 -40 Z" fill="#FDE68A" transform={`rotate(${i * 22.5} 300 400)`} />
            ))}
            <animateTransform attributeName="transform" type="rotate" from="0 300 400" to="360 300 400" dur="70s" repeatCount="indefinite" />
          </g>
          {/* Marble columns either side */}
          {[60, 540].map((x) => (
            <g key={x}>
              <rect x={x - 34} y="150" width="68" height="20" rx="4" fill="#F5F0E1" stroke="#C9BFA8" strokeWidth="3" />
              <rect x={x - 24} y="170" width="48" height="540" fill="#EDE6D3" stroke="#C9BFA8" strokeWidth="3" />
              {[-12, 0, 12].map((d) => (
                <path key={d} d={`M${x + d} 176 L${x + d} 704`} stroke="#C9BFA8" strokeWidth="3" />
              ))}
              <rect x={x - 34} y="704" width="68" height="22" rx="4" fill="#F5F0E1" stroke="#C9BFA8" strokeWidth="3" />
            </g>
          ))}
          {/* A laurel arch overhead */}
          <Laurel x0={90} y0={140} cx={300} cy={-90} x1={510} y1={140} n={14} size={16} fill="#B7F33B" stroke="#4D7C0F" />
        </g>
      )
    case 'soulbound':
      return (
        <g>
          {/* Two linked rings, one for each partner */}
          <ellipse cx="230" cy="390" rx="200" ry="240" fill="none" stroke="#22D3EE" strokeWidth="6" opacity="0.5" className="cd-glow" />
          <ellipse cx="370" cy="390" rx="200" ry="240" fill="none" stroke="#F0ABFC" strokeWidth="6" opacity="0.5" className="cd-glow cd-d2" />
          {/* Spirit wisps and hearts floating up */}
          {[[80, 560, '#22D3EE'], [520, 600, '#F0ABFC'], [150, 300, '#A5F3FC'], [470, 280, '#F5D0FE'], [300, 680, '#22D3EE']].map(([x, y, c], i) => (
            <g key={i} className={`cd-rise cd-d${(i % 3) + 1}`}>
              <path d={heart(Number(x), Number(y), 16)} fill={String(c)} opacity="0.85" />
            </g>
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <circle key={i} cx={40 + rand(i + 7) * 520} cy={40 + rand(i + 9) * 600} r={6 + rand(i) * 6} fill={i % 2 ? '#A5F3FC' : '#F5D0FE'} className={`cd-twinkle cd-d${(i % 3) + 1}`} />
          ))}
        </g>
      )
    case 'cheer':
      return (
        <g>
          {/* Stage spotlights */}
          <path d="M60 -20 L230 760 L60 760 Z" fill="#FDF2F8" opacity="0.12" />
          <path d="M540 -20 L370 760 L540 760 Z" fill="#FDF2F8" opacity="0.12" />
          {/* Confetti falling */}
          {Array.from({ length: 18 }, (_, i) => {
            const x = 20 + rand(i + 1) * 560
            const y = rand(i + 30) * 500
            const colors = ['#F472B6', '#FDE68A', '#67E8F9', '#C084FC', '#FFFFFF', '#FB7185']
            return (
              <g key={i} className="cd-fall" style={{ animationDelay: `${(rand(i + 60) * 3).toFixed(2)}s`, animationDuration: `${(3 + rand(i + 90) * 2).toFixed(2)}s` }}>
                {i % 3 === 0 ? <path d={star(x, y, 10)} fill={colors[i % 6]} /> : <rect x={x} y={y} width="12" height="7" rx="2" fill={colors[i % 6]} transform={`rotate(${(rand(i + 5) * 180).toFixed(0)} ${x} ${y})`} />}
              </g>
            )
          })}
          {/* Sparkle bursts */}
          {[[110, 200], [490, 160], [520, 520], [80, 560]].map(([x, y], i) => (
            <path key={i} d={star(x, y, 22)} fill="#FDE68A" className={`cd-twinkle cd-d${(i % 3) + 1}`} />
          ))}
          {/* A megaphone heart-burst "GO!" sign */}
          <g transform="rotate(-10 470 640)">
            <rect x="420" y="612" width="104" height="52" rx="14" fill="#EC4899" stroke="#FFFFFF" strokeWidth="4" />
            <text x="472" y="650" textAnchor="middle" fontSize="34" fontWeight="900" fill="#FFFFFF" fontFamily="system-ui, sans-serif">
              GO!
            </text>
          </g>
        </g>
      )
    default:
      return null
  }
}

/** Hats, crowns and what's worn on the face. Drawn over the face. */
export function KudosSkinHat({ gear, p }: { gear: Gear; p: GearPaint }) {
  switch (gear) {
    case 'sage':
      return (
        <g>
          {/* A jade circlet across the brow with three stones */}
          <path d={`M${edgeX(206, 14)} 200 Q300 176 ${600 - edgeX(206, 14)} 200`} stroke={p.gold} strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={`M${edgeX(206, 14)} 200 Q300 176 ${600 - edgeX(206, 14)} 200`} stroke="#10B981" strokeWidth="5" fill="none" strokeLinecap="round" />
          {[236, 364].map((x) => (
            <ellipse key={x} cx={x} cy="192" rx="12" ry="9" fill="#34D399" stroke="#ECFDF5" strokeWidth="2" />
          ))}
          <ellipse cx="300" cy="186" rx="20" ry="15" fill="#10B981" stroke="#ECFDF5" strokeWidth="3" />
          <ellipse cx="294" cy="181" rx="6" ry="4" fill="#FFFFFF" opacity="0.7" />
          {/* A lotus crown and a feather tucked in the side */}
          <Lotus cx={300} cy={92} s={48} />
          <circle cx="300" cy="40" r="40" fill="#6EE7B7" opacity="0.25" className="cd-glow" />
          <Feather x={420} y={190} h={130} deg={28} fill="#D1FAE5" vein="#059669" />
        </g>
      )
    case 'archer':
      return (
        <g>
          {/* Silver circlet with feathered wings at the temples */}
          <path d={`M${edgeX(200, 12)} 198 Q300 168 ${600 - edgeX(200, 12)} 198`} stroke="#E2E8F0" strokeWidth="10" fill="none" strokeLinecap="round" />
          {[-1, 1].map((side) => {
            const x = side < 0 ? edgeX(196, 12) : 600 - edgeX(196, 12)
            return (
              <g key={side} fill="#E0F2FE" stroke="#7DD3FC" strokeWidth="2" strokeLinejoin="round">
                <path d={`M${x} 196 L${x + side * 58} 120 L${x + side * 22} 180 Z`} />
                <path d={`M${x} 204 L${x + side * 74} 150 L${x + side * 26} 200 Z`} />
                <path d={`M${x} 210 L${x + side * 62} 190 L${x + side * 20} 214 Z`} />
              </g>
            )
          })}
          {/* A crescent moon on the brow holding a star gem */}
          <path d="M276 104 A44 44 0 1 0 324 104 A34 34 0 1 1 276 104 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" transform="translate(0 40)" />
          <path d={star(300, 168, 16)} fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="300" cy="168" r="30" fill="#7DD3FC" opacity="0.35" className="cd-glow" />
        </g>
      )
    case 'volt':
      return (
        <g>
          {/* Headphones: a band over the top and big cups at the sides */}
          <path d={`M${edgeX(250, 26)} 250 L${edgeX(250, 26)} 200 A186 186 0 0 1 ${600 - edgeX(250, 26)} 200 L${600 - edgeX(250, 26)} 250`} stroke="#15171C" strokeWidth="18" fill="none" />
          <path d={`M${edgeX(250, 26)} 220 A186 186 0 0 1 ${600 - edgeX(250, 26)} 220`} stroke="#FACC15" strokeWidth="4" fill="none" opacity="0.8" />
          {[-1, 1].map((side) => {
            const x = side < 0 ? 104 : 496
            return (
              <g key={side}>
                <rect x={x - 26} y="236" width="52" height="104" rx="22" fill="#15171C" stroke="#FACC15" strokeWidth="4" />
                <path d={`M${x + 6} 256 L${x - 9} 292 L${x + 1} 292 L${x - 6} 324 L${x + 12} 282 L${x + 2} 282 L${x + 11} 256 Z`} fill="#FACC15" />
              </g>
            )
          })}
          {/* An antenna with a spark on top */}
          <path d="M420 108 L452 40" stroke="#15171C" strokeWidth="6" strokeLinecap="round" />
          <circle cx="452" cy="38" r="10" fill="#FDE047" className="cd-glow" />
          {/* A see-through visor across the eyes, its scanline sweeping */}
          <rect x="142" y="262" width="316" height="76" rx="34" fill="#FACC15" opacity="0.28" stroke="#FDE047" strokeWidth="5" />
          <rect x="150" y="296" width="300" height="5" rx="2" fill="#FEF9C3" opacity="0.8" className="cd-glow" />
          <path d="M170 280 L210 280" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
        </g>
      )
    case 'titan':
      return (
        <g>
          {/* Horns curving up out of an obsidian helm */}
          {[-1, 1].map((side) => {
            const x = side < 0 ? edgeX(170, 16) + 20 : 600 - edgeX(170, 16) - 20
            return <path key={side} d={`M${x} 176 Q${x + side * -70} 120 ${x + side * -60} 10 Q${x + side * -30} 80 ${x + side * 36} 146 Z`} fill="#2A1A1E" stroke="#F97316" strokeWidth="4" strokeLinejoin="round" />
          })}
          <path d={`${headTop(222, 18)} Z`} fill="#1C1416" stroke="#3A2A2E" strokeWidth="4" />
          {/* Lava glowing through the cracks */}
          <path d="M160 200 L200 170 L214 130 M300 64 L292 110 L320 150 L304 210 M420 190 L392 160 L404 118" stroke="#F97316" strokeWidth="6" fill="none" strokeLinejoin="round" strokeLinecap="round" className="cd-glow" />
          <path d="M160 200 L200 170 L214 130 M300 64 L292 110 L320 150 L304 210 M420 190 L392 160 L404 118" stroke="#FDE68A" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <rect x={edgeX(222, 18)} y="210" width={600 - 2 * edgeX(222, 18)} height="20" rx="6" fill="#3A2A2E" stroke="#F97316" strokeWidth="3" />
          {/* A burning gem on the brow */}
          <path d="M300 196 L318 220 L300 244 L282 220 Z" fill="#F43F5E" stroke="#FDE68A" strokeWidth="3" />
          <circle cx="300" cy="220" r="30" fill="#FB923C" opacity="0.35" className="cd-glow" />
        </g>
      )
    case 'olympian':
      return (
        <g>
          {/* A golden laurel wreath around the head, tied at the back, meeting at a gem in front */}
          <Laurel x0={edgeX(250, 14)} y0={250} cx={150} cy={110} x1={290} y1={92} n={7} size={20} fill="#E7C14A" stroke="#8C6A12" />
          <Laurel x0={600 - edgeX(250, 14)} y0={250} cx={450} cy={110} x1={310} y1={92} n={7} size={20} fill="#E7C14A" stroke="#8C6A12" />
          <circle cx="300" cy="92" r="14" fill="#B7F33B" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="300" cy="92" r="30" fill="#B7F33B" opacity="0.3" className="cd-glow" />
        </g>
      )
    case 'soulbound':
      return (
        <g>
          {/* Two halos linked above the head */}
          <ellipse cx="268" cy="44" rx="84" ry="20" fill="none" stroke="#A5F3FC" strokeWidth="16" opacity="0.35" />
          <ellipse cx="268" cy="44" rx="84" ry="20" fill="none" stroke="#22D3EE" strokeWidth="7" />
          <ellipse cx="332" cy="50" rx="84" ry="20" fill="none" stroke="#F5D0FE" strokeWidth="16" opacity="0.35" />
          <ellipse cx="332" cy="50" rx="84" ry="20" fill="none" stroke="#F0ABFC" strokeWidth="7" />
          {/* A heart gem on the brow and spirit marks under the eyes */}
          <path d={heart(300, 190, 18)} fill="#F0ABFC" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="300" cy="186" r="32" fill="#22D3EE" opacity="0.25" className="cd-glow" />
          <path d="M196 352 l14 10 l-14 10 M404 352 l-14 10 l14 10" stroke="#22D3EE" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )
    case 'cheer':
      return (
        <g>
          {/* A big bow on top, with a star clip */}
          <g transform="rotate(-8 300 86)">
            <path d="M300 86 Q236 20 196 50 Q180 92 210 128 Q252 128 300 86 Z" fill="#F472B6" stroke="#BE185D" strokeWidth="4" strokeLinejoin="round" />
            <path d="M300 86 Q364 20 404 50 Q420 92 390 128 Q348 128 300 86 Z" fill="#F472B6" stroke="#BE185D" strokeWidth="4" strokeLinejoin="round" />
            <path d="M224 62 Q240 50 262 64 M376 62 Q360 50 338 64" stroke="#FFFFFF" strokeWidth="6" fill="none" opacity="0.6" strokeLinecap="round" />
            {[[226, 92], [252, 74], [374, 92], [348, 74]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#FFFFFF" opacity="0.85" />
            ))}
            <path d="M290 96 L272 150 L292 140 Z M310 96 L328 150 L308 140 Z" fill="#EC4899" stroke="#BE185D" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="300" cy="88" r="20" fill="#EC4899" stroke="#BE185D" strokeWidth="4" />
            <path d={star(300, 88, 13)} fill="#FDE68A" />
          </g>
          {/* Star and heart face stickers */}
          <path d={star(196, 356, 14)} fill="#FDE68A" stroke="#F59E0B" strokeWidth="2" />
          <path d={heart(404, 358, 11)} fill="#F472B6" stroke="#BE185D" strokeWidth="2" />
        </g>
      )
    default:
      return null
  }
}

/** The item in the raised hand. */
export function KudosSkinHeld({ gear }: { gear: Gear }) {
  switch (gear) {
    case 'sage':
      // A jade feather fan opening above the hand.
      return (
        <g>
          {[-56, -34, -12, 12, 34, 56].map((deg, i) => (
            <g key={deg} transform={`rotate(${deg} 539 290)`}>
              <Feather x={539} y={290} h={170} deg={0} fill={i % 2 ? '#A7F3D0' : '#D1FAE5'} vein="#047857" />
            </g>
          ))}
          <path d="M470 220 A96 96 0 0 1 608 220" stroke="#D9AE4A" strokeWidth="6" fill="none" />
          <circle cx="539" cy="290" r="12" fill="#10B981" stroke="#D9AE4A" strokeWidth="4" />
          <path d="M539 300 q-6 30 4 54 M539 300 q10 26 2 50" stroke="#10B981" strokeWidth="4" fill="none" />
        </g>
      )
    case 'archer':
      // A starlight bow, its string pulled straight, a star at each tip.
      return (
        <g>
          <path d="M548 130 Q620 290 548 450" stroke="#0EA5E9" strokeWidth="18" fill="none" opacity="0.3" />
          <path d="M548 130 Q620 290 548 450" stroke="#E2E8F0" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M548 130 Q620 290 548 450" stroke="#38BDF8" strokeWidth="4" fill="none" />
          <path d="M548 132 L548 448" stroke="#E0F2FE" strokeWidth="2.5" opacity="0.9" />
          <path d={star(548, 128, 15)} fill="#FFFFFF" stroke="#38BDF8" strokeWidth="2" className="cd-twinkle" />
          <path d={star(548, 452, 15)} fill="#FFFFFF" stroke="#38BDF8" strokeWidth="2" className="cd-twinkle cd-d2" />
          {/* An arrow of light, nocked */}
          <path d="M440 290 L600 290" stroke="#7DD3FC" strokeWidth="5" strokeLinecap="round" />
          <path d="M600 290 L584 280 L584 300 Z" fill="#FFFFFF" />
          <path d="M440 290 l-14 -10 M440 290 l-14 10 M452 290 l-14 -10 M452 290 l-14 10" stroke="#BAE6FD" strokeWidth="4" strokeLinecap="round" />
        </g>
      )
    case 'volt':
      // A crackling ball of lightning held above the hand.
      return (
        <g>
          <circle cx="539" cy="196" r="54" fill="#FACC15" opacity="0.25" className="cd-glow" />
          <circle cx="539" cy="196" r="34" fill="#FEF9C3" stroke="#FACC15" strokeWidth="6" />
          <g stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round">
            <path d="M539 162 L530 186 L548 196 L536 230" className="cd-twinkle" />
            <path d="M505 196 L526 204 L540 188 L572 198" className="cd-twinkle cd-d2" />
          </g>
          <g stroke="#FDE047" strokeWidth="4" fill="none" strokeLinecap="round">
            <path d="M488 160 l-18 -12 l10 -8 l-20 -14" className="cd-twinkle cd-d1" />
            <path d="M590 150 l18 -14 l-10 -6 l20 -16" className="cd-twinkle cd-d3" />
            <path d="M590 240 l22 8 l-8 10 l22 10" className="cd-twinkle cd-d2" />
          </g>
        </g>
      )
    case 'titan':
      // A huge meteor hammer: a black rock head with lava cracks, flames on top.
      return (
        <g>
          {/* Handle */}
          <rect x="530" y="150" width="18" height="152" rx="6" fill="#3A2A2E" stroke="#120A0C" strokeWidth="3" />
          {[190, 226, 262].map((y) => (
            <rect key={y} x="526" y={y} width="26" height="10" rx="4" fill="#F97316" className="cd-glow" />
          ))}
          {/* Flames licking off the top */}
          {[470, 504, 539, 574, 608].map((x, i) => (
            <path key={x} d={`M${x} 66 q-18 -36 0 -76 q18 40 0 76 Z`} fill={i % 2 ? '#FB923C' : '#FDE68A'} opacity="0.9" className="cd-flick" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
          {/* A big block of meteor rock, lava in its cracks */}
          <path d="M444 72 L520 52 L634 64 L648 134 L630 168 L540 176 L456 164 L436 120 Z" fill="#2A1A1E" stroke="#120A0C" strokeWidth="5" strokeLinejoin="round" />
          <path d="M456 80 L520 62 L620 72" stroke="#4A3236" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M466 98 L500 120 L486 150 M540 62 L552 106 L598 120 L620 98 M560 170 L578 132 L612 146" stroke="#F97316" strokeWidth="8" fill="none" strokeLinejoin="round" strokeLinecap="round" className="cd-glow" />
          <path d="M466 98 L500 120 L486 150 M540 62 L552 106 L598 120 L620 98 M560 170 L578 132 L612 146" stroke="#FDE68A" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="540" cy="114" r="70" fill="#F97316" opacity="0.12" />
        </g>
      )
    case 'olympian':
      // A golden torch with a living flame.
      return (
        <g>
          <path d="M524 150 L554 150 L546 300 L532 300 Z" fill="#D9AE4A" stroke="#8C6A12" strokeWidth="3" strokeLinejoin="round" />
          <rect x="516" y="138" width="46" height="18" rx="5" fill="#E7C14A" stroke="#8C6A12" strokeWidth="3" />
          <path d="M528 190 L550 190 M530 230 L548 230" stroke="#8C6A12" strokeWidth="3" />
          <g className="cd-flick">
            <path d="M539 138 Q494 100 520 50 Q528 80 540 70 Q534 30 560 4 Q556 48 578 66 Q590 104 539 138 Z" fill="#FB923C" />
            <path d="M539 136 Q510 108 528 76 Q536 96 546 88 Q546 60 562 44 Q562 76 572 92 Q574 116 539 136 Z" fill="#FDE047" />
            <path d="M539 132 Q526 116 536 100 Q542 110 548 104 Q556 118 539 132 Z" fill="#ECFCCB" />
          </g>
        </g>
      )
    case 'soulbound':
      // A lantern holding two hearts that glow.
      return (
        <g>
          <path d="M539 294 L539 252" stroke="#94A3B8" strokeWidth="4" />
          <path d="M520 252 Q539 232 558 252" stroke="#CBD5E1" strokeWidth="5" fill="none" />
          <rect x="500" y="250" width="78" height="14" rx="5" fill="#E2E8F0" />
          <path d="M506 264 L572 264 L566 120 L512 120 Z" fill="#CFFAFE" opacity="0.35" stroke="#E2E8F0" strokeWidth="4" strokeLinejoin="round" />
          <rect x="500" y="108" width="78" height="14" rx="5" fill="#E2E8F0" />
          <path d="M524 108 L539 84 L554 108 Z" fill="#E2E8F0" />
          <circle cx="539" cy="190" r="44" fill="#22D3EE" opacity="0.3" className="cd-glow" />
          <path d={heart(526, 196, 16)} fill="#22D3EE" stroke="#FFFFFF" strokeWidth="2" className="cd-glow" />
          <path d={heart(552, 178, 16)} fill="#F0ABFC" stroke="#FFFFFF" strokeWidth="2" className="cd-glow cd-d2" />
        </g>
      )
    case 'cheer':
      return <PomPom cx={539} cy={236} r={64} shake />
    default:
      return null
  }
}

/** Left-hand items: Soulbound's spirit companion, the cheer captain's second pom-pom. */
export function KudosSkinOffhand({ gear }: { gear: Gear }) {
  if (gear === 'soulbound')
    return (
      <g className="cd-bob">
        {/* A little spirit fox floating by the hand */}
        <path d="M44 378 Q40 316 86 310 Q132 316 128 378 Q120 418 100 402 Q86 420 72 402 Q52 418 44 378 Z" fill="#CFFAFE" opacity="0.92" stroke="#22D3EE" strokeWidth="4" />
        <path d="M54 330 L50 288 L76 316 Z M118 330 L122 288 L96 316 Z" fill="#CFFAFE" stroke="#22D3EE" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="70" cy="352" r="7" fill="#0E4A5C" />
        <circle cx="102" cy="352" r="7" fill="#0E4A5C" />
        <circle cx="72" cy="349" r="2.5" fill="#FFFFFF" />
        <circle cx="104" cy="349" r="2.5" fill="#FFFFFF" />
        <ellipse cx="60" cy="368" rx="8" ry="4" fill="#F0ABFC" opacity="0.7" />
        <ellipse cx="112" cy="368" rx="8" ry="4" fill="#F0ABFC" opacity="0.7" />
        <path d="M80 368 Q86 374 92 368" stroke="#0E4A5C" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    )
  if (gear === 'cheer') return <PomPom cx={85} cy={426} r={54} shake />
  return null
}

/** Robes, armor and uniforms over the handle. */
export function KudosSkinBody({ gear, hx, hw, p }: { gear: Gear; hx: number; hw: number; p: GearPaint }) {
  const r = hx + hw
  switch (gear) {
    case 'sage':
      return (
        <g>
          <path d={`M${hx - 14} 500 L${r + 14} 500 L${r + 40} 690 Q300 706 ${hx - 40} 690 Z`} fill="#ECFDF5" stroke="#10B981" strokeWidth="4" />
          <path d={`M${hx - 6} 502 L300 560 L${r + 6} 502`} stroke="#10B981" strokeWidth="10" fill="none" />
          <rect x={hx - 22} y="574" width={hw + 44} height="18" rx="6" fill="#10B981" stroke={p.gold} strokeWidth="3" />
          <circle cx="300" cy="583" r="12" fill="#34D399" stroke={p.gold} strokeWidth="3" />
          <path d={`M${hx - 36} 682 Q300 700 ${r + 36} 682`} stroke="#34D399" strokeWidth="5" fill="none" />
        </g>
      )
    case 'archer':
      return (
        <g>
          <rect x={hx - 10} y="500" width={hw + 20} height="112" rx="14" fill="#1E2A5A" stroke="#38BDF8" strokeWidth="3" />
          <path d={`M${hx - 6} 506 L${r + 6} 600`} stroke="#94A3B8" strokeWidth="9" />
          <path d={`M${hx - 6} 506 L${r + 6} 600`} stroke="#E2E8F0" strokeWidth="3" strokeDasharray="8 8" />
          <rect x={hx - 10} y="580" width={hw + 20} height="10" fill="#E2E8F0" />
          <path d={star(300, 532, 12)} fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2" />
        </g>
      )
    case 'volt':
      return (
        <g>
          <rect x={hx - 10} y="500" width={hw + 20} height="112" rx="14" fill="#15171C" />
          <path d={`M${hx - 4} 504 L300 556 L${r + 4} 504 M${hx - 4} 600 L${hx + 10} 560 M${r + 4} 600 L${r - 10} 560`} stroke="#FACC15" strokeWidth="4" fill="none" className="cd-glow" />
          <path d={bolt(304, 540, 48)} fill="#FACC15" transform="translate(-6 0)" />
        </g>
      )
    case 'titan':
      return (
        <g>
          {[-1, 1].map((side) => {
            const x = side < 0 ? hx - 20 : r + 20
            return (
              <g key={side}>
                <ellipse cx={x} cy="502" rx="36" ry="22" fill="#2A1A1E" stroke="#F97316" strokeWidth="3" />
                <path d={`M${x + side * 10} 488 L${x + side * 34} 452 L${x + side * 26} 494 Z`} fill="#3A2A2E" stroke="#F97316" strokeWidth="2" />
              </g>
            )
          })}
          <rect x={hx - 12} y="500" width={hw + 24} height="108" rx="14" fill="#1C1416" stroke="#3A2A2E" strokeWidth="3" />
          <path d={`M${hx + 4} 520 L290 548 L300 590 M${r - 4} 524 L314 552`} stroke="#F97316" strokeWidth="5" fill="none" strokeLinejoin="round" className="cd-glow" />
          <rect x={hx - 14} y="590" width={hw + 28} height="16" rx="5" fill="#3A2A2E" stroke="#F97316" strokeWidth="3" />
        </g>
      )
    case 'olympian':
      return (
        <g>
          <path d={`M${hx - 12} 500 L${r + 12} 500 L${r + 22} 640 Q300 652 ${hx - 22} 640 Z`} fill="#FFFFFF" stroke="#D9D2BF" strokeWidth="3" />
          <path d={`M${r + 8} 500 Q300 560 ${hx - 16} 620`} stroke={p.gold} strokeWidth="14" fill="none" />
          <path d={`M${hx - 18} 630 Q300 648 ${r + 18} 630`} stroke={p.gold} strokeWidth="5" fill="none" />
          {/* A gold medal on a lime ribbon */}
          <path d="M280 496 L300 540 L320 496" stroke="#B7F33B" strokeWidth="10" fill="none" />
          <circle cx="300" cy="552" r="18" fill={p.gold} stroke="#8C6A12" strokeWidth="3" />
          <path d={star(300, 552, 9)} fill="#FFF4C2" />
        </g>
      )
    case 'soulbound':
      return (
        <g>
          <path d={`M${hx - 14} 500 L${r + 14} 500 L${r + 36} 680 Q300 696 ${hx - 36} 680 Z`} fill="#0E4A5C" stroke="#22D3EE" strokeWidth="4" />
          <path d={`M${hx - 30} 672 Q300 690 ${r + 30} 672`} stroke="#F0ABFC" strokeWidth="4" fill="none" />
          <path d={`M${hx} 504 Q300 540 ${r} 504`} stroke="#A5F3FC" strokeWidth="5" fill="none" />
          <path d={heart(300, 532, 14)} fill="#F0ABFC" stroke="#FFFFFF" strokeWidth="2" className="cd-glow" />
        </g>
      )
    case 'cheer':
      return (
        <g>
          {/* A pleated skirt */}
          <path d={`M${hx - 10} 588 L${r + 10} 588 L${r + 40} 646 L${hx - 40} 646 Z`} fill="#F472B6" stroke="#BE185D" strokeWidth="3" strokeLinejoin="round" />
          {Array.from({ length: 6 }, (_, i) => {
            const t = (i + 1) / 7
            const top = hx - 10 + (hw + 20) * t
            const bottom = hx - 40 + (hw + 80) * t
            return <path key={i} d={`M${top} 590 L${bottom} 644`} stroke="#BE185D" strokeWidth="2.5" />
          })}
          <path d={`M${hx - 40} 640 L${r + 40} 640`} stroke="#FFFFFF" strokeWidth="5" />
          {/* The uniform top, with a pink V and a star */}
          <rect x={hx - 10} y="500" width={hw + 20} height="94" rx="14" fill="#FFFFFF" stroke="#F9A8D4" strokeWidth="3" />
          <path d={`M${hx - 6} 504 L300 552 L${r + 6} 504`} stroke="#F472B6" strokeWidth="12" fill="none" />
          <path d={`M${hx - 6} 520 L300 568 L${r + 6} 520`} stroke="#FDE68A" strokeWidth="4" fill="none" />
          <path d={star(300, 576, 11)} fill="#F472B6" />
        </g>
      )
    default:
      return null
  }
}
