import type { Gear } from '../../cosmetics/visuals'
import { useSvgIds } from '../../lib/svgIds'
import { edgeX, headTop } from './characterArt'
import type { GearPaint } from './gearArt'

// The second wave of premium (Mythic) skins in 2D: Frost Monarch, Spirit Kitsune and Neon Ronin.
// Same design coordinates as gearArt.tsx: head x 120..480, y 80..490, raised hand at 539,294,
// other hand at 85,430. The 3D versions are in character3d/premiumSkins.ts.

export const PREMIUM_SKIN_GEARS = ['frost', 'kitsune', 'mecha'] as const
export type PremiumSkinGear = (typeof PREMIUM_SKIN_GEARS)[number]
export const isPremiumSkinGear = (gear: Gear): gear is PremiumSkinGear => (PREMIUM_SKIN_GEARS as readonly Gear[]).includes(gear)

/** Where the held item's effect glows: [cx, cy, rx, ry]. */
export const PREMIUM_SKIN_GLOW: Record<PremiumSkinGear, [number, number, number, number]> = {
  frost: [539, 92, 56, 56],
  kitsune: [539, 96, 56, 60],
  mecha: [539, 130, 26, 110],
}

const DELAYS = ['', 'cd-d1', 'cd-d2', 'cd-d3']

/** Steady pseudo-random 0–1, so snowflakes and streaks sit in the same places on every render. */
const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** The top of the head's outline at x (the edge guard included). */
const topY = (x: number) => 230 - Math.sqrt(157 ** 2 - Math.max(0, Math.abs(x - 300) - 30) ** 2)

/** A six-armed snowflake centred on the origin, `r` long. */
const snowflake = (r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2
    const at = (d: number, turn = 0, l = 0) => {
      const x = Math.sin(a) * d + Math.sin(a + turn) * l
      const y = -Math.cos(a) * d - Math.cos(a + turn) * l
      return `${x.toFixed(1)} ${y.toFixed(1)}`
    }
    const k = r * 0.55
    return `M0 0 L${at(r)} M${at(k)} L${at(k, 0.8, r * 0.3)} M${at(k)} L${at(k, -0.8, r * 0.3)}`
  }).join(' ')

/** A tall ice crystal standing on (x, base), `h` tall and `w` half-wide. */
const crystal = (x: number, base: number, h: number, w: number) =>
  `M${x} ${base - h} L${x + w} ${base - h * 0.35} L${x} ${base + 10} L${x - w} ${base - h * 0.35} Z`

/** A flame pointing up from the origin. */
const FLAME = 'M0 0 C-14 -10 -12 -32 0 -54 C4 -36 14 -28 10 -14 C18 -22 18 -32 14 -38 C26 -24 22 -4 0 0 Z'

/** A fox tail from its root at the origin, pointing up and curling to the right. */
const TAIL = 'M-12 0 C-58 -60 -74 -170 -30 -250 Q0 -300 46 -318 Q30 -290 38 -262 C64 -190 52 -70 12 0 Z'
const TAIL_TIP = 'M-14 -276 Q8 -306 46 -318 Q30 -290 38 -262 Q18 -268 -14 -276 Z'

/** Each skin's own backdrop, drawn behind the premium glow. */
export function PremiumSkinBackdrop({ gear }: { gear: Gear }) {
  const ids = useSvgIds('aurora0', 'aurora1', 'aurora2')
  switch (gear) {
    case 'frost': {
      const colors = ['#5EEAD4', '#7DD3FC', '#A78BFA']
      const band = (y: number) => `M-40 ${y} Q80 ${y - 46} 200 ${y} T440 ${y} T680 ${y} L680 ${y + 80} Q560 ${y + 36} 440 ${y + 80} T200 ${y + 80} T-40 ${y + 80} Z`
      return (
        <g>
          <defs>
            {colors.map((c, i) => (
              <linearGradient key={c} id={ids[`aurora${i}` as 'aurora0']} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={c} stopOpacity="0" />
                <stop offset="0.7" stopColor={c} stopOpacity="0.55" />
                <stop offset="0.92" stopColor={c} stopOpacity="0.9" />
                <stop offset="1" stopColor={c} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {/* Aurora curtains rippling across the sky */}
          {[30, 110, 190].map((y, i) => (
            <path key={y} d={band(y)} fill={`url(#${ids[`aurora${i}` as 'aurora0']})`} className={`cd-aurora ${DELAYS[i + 1]}`} />
          ))}
          {/* Snowflakes drifting down */}
          {Array.from({ length: 12 }, (_, i) => (
            <g key={i} transform={`translate(${(20 + rand(i) * 560).toFixed(0)} ${(-30 - rand(i + 40) * 80).toFixed(0)})`}>
              <g className="cd-snow" style={{ animationDelay: `-${(rand(i + 9) * 9).toFixed(2)}s`, animationDuration: `${(7 + rand(i + 3) * 4).toFixed(2)}s` }}>
                <path d={snowflake(8 + rand(i + 21) * 8)} stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </g>
            </g>
          ))}
          {/* Ice crystals around the feet, on a patch of frost */}
          <ellipse cx="300" cy="742" rx="230" ry="30" fill="#BAE6FD" opacity="0.35" className="cd-glow" />
          {(
            [
              [96, 748, 70, 16], [140, 740, 110, 20], [180, 752, 60, 14], [420, 752, 64, 14], [462, 740, 116, 20], [508, 750, 74, 16], [60, 756, 44, 11], [544, 758, 46, 11],
            ] as const
          ).map(([x, b, h, w]) => (
            <g key={x}>
              <path d={crystal(x, b, h, w)} fill="#D6F1FF" stroke="#7DD3FC" strokeWidth="3" strokeLinejoin="round" opacity="0.92" />
              <path d={`M${x} ${b - h + 8} L${x} ${b + 4}`} stroke="#FFFFFF" strokeWidth="2.5" opacity="0.7" />
            </g>
          ))}
        </g>
      )
    }
    case 'kitsune': {
      const angles = [-72, 72, -54, 54, -36, 36, -18, 18, 0]
      return (
        <g>
          {/* Nine tails fanning out from behind, swaying */}
          {angles.map((a, i) => {
            const k = 1.3 - (Math.abs(a) / 72) * 0.3
            return (
              <g key={a} transform={`translate(300 600) rotate(${a}) scale(${a < 0 ? -k : k} ${k})`}>
                <g className="cd-sway" style={{ animationDelay: `${(i * 0.23).toFixed(2)}s` }}>
                  <path d={TAIL} fill="#FFFFFF" stroke="#D9A3B8" strokeWidth="5" strokeLinejoin="round" />
                  <path d={TAIL_TIP} fill="#FF6FA8" />
                  <path d="M-22 -120 Q-34 -170 -16 -214 M18 -96 Q30 -156 16 -204" stroke="#F3D6E0" strokeWidth="3" fill="none" strokeLinecap="round" />
                </g>
              </g>
            )
          })}
          {/* Fox-fire floating around */}
          {(
            [
              [70, 210, 1, '#FF5CA8'], [530, 250, 0.9, '#C084FC'], [40, 520, 0.8, '#C084FC'], [560, 560, 0.85, '#FF5CA8'], [300, 30, 0.7, '#FF5CA8'],
            ] as const
          ).map(([x, y, s, c], i) => (
            <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
              <g className="cd-bob" style={{ animationDelay: `${i * 0.5}s` }}>
                <circle cy="-22" r="30" fill={c} opacity="0.25" />
                <g className={`cd-flick ${DELAYS[i % 4]}`}>
                  <path d={FLAME} fill={c} />
                  <path d={FLAME} transform="scale(0.5) translate(0 -2)" fill="#FFFFFF" />
                </g>
              </g>
            </g>
          ))}
          {/* A spirit circle on the ground */}
          <ellipse cx="300" cy="740" rx="200" ry="30" fill="#FF5CA8" opacity="0.18" />
          <ellipse cx="300" cy="740" rx="200" ry="30" fill="none" stroke="#FF5CA8" strokeWidth="4" className="cd-glow" />
          <ellipse cx="300" cy="740" rx="160" ry="22" fill="none" stroke="#FBCFE8" strokeWidth="3" strokeDasharray="14 10" className="cd-dash" />
        </g>
      )
    }
    case 'mecha':
      return (
        <g>
          {/* Holographic rings turning behind */}
          <circle cx="300" cy="400" r="250" fill="none" stroke="#2DD4BF" strokeWidth="6" strokeDasharray="130 40" opacity="0.75" className="cd-spin" />
          <circle cx="300" cy="400" r="200" fill="none" stroke="#F472B6" strokeWidth="5" strokeDasharray="70 60" opacity="0.7" className="cd-spin-rev" />
          <circle cx="300" cy="400" r="280" fill="none" stroke="#5EEAD4" strokeWidth="10" strokeDasharray="2 14" opacity="0.4" />
          {/* Data streaks falling */}
          {Array.from({ length: 12 }, (_, i) => (
            <rect
              key={i}
              x={(30 + (i / 11) * 540 + (rand(i) - 0.5) * 30).toFixed(0)}
              y="-120"
              width="4"
              height={(70 + rand(i + 5) * 60).toFixed(0)}
              rx="2"
              fill={i % 3 ? '#2DD4BF' : '#F472B6'}
              opacity="0.8"
              className="cd-stream"
              style={{ animationDelay: `-${(rand(i + 11) * 3).toFixed(2)}s`, animationDuration: `${(2.4 + rand(i + 2) * 1.6).toFixed(2)}s` }}
            />
          ))}
          {/* A scan pulse sweeping out across the floor */}
          <ellipse cx="300" cy="740" rx="170" ry="24" fill="none" stroke="#2DD4BF" strokeWidth="3" opacity="0.8" />
          <ellipse cx="300" cy="740" rx="200" ry="28" fill="none" stroke="#5EEAD4" strokeWidth="4" className="cd-ripple" />
          <ellipse cx="300" cy="740" rx="200" ry="28" fill="none" stroke="#5EEAD4" strokeWidth="4" className="cd-ripple cd-d2" />
        </g>
      )
    default:
      return null
  }
}

/** Hats, crowns and what's worn on the face. */
export function PremiumSkinHat({ gear, p }: { gear: Gear; p: GearPaint }) {
  switch (gear) {
    case 'frost': {
      const spikes: [number, number, number, number][] = [
        [196, 72, 17, -16], [248, 108, 21, -7], [300, 150, 24, 0], [352, 108, 21, 7], [404, 72, 17, 16],
      ]
      const bandL = edgeX(196, 12)
      return (
        <g>
          {/* A crown of ice crystals rising from the head */}
          {spikes.map(([x, h, w, tilt], i) => {
            const base = topY(x) + 18
            return (
              <g key={x} transform={`rotate(${tilt} ${x} ${base})`}>
                <path d={crystal(x, base, h, w)} fill="#D6F1FF" stroke="#4AA8E0" strokeWidth="4" strokeLinejoin="round" />
                <path d={`M${x} ${base - h + 6} L${x + w * 0.55} ${base - h * 0.35} L${x} ${base + 4}`} fill="#FFFFFF" opacity="0.55" />
                <path d="M0 -12 Q1.5 -1.5 12 0 Q1.5 1.5 0 12 Q-1.5 1.5 -12 0 Q-1.5 -1.5 0 -12 Z" transform={`translate(${x} ${base - h})`} fill="#FFFFFF" className={`cd-twinkle ${DELAYS[i % 4]}`} />
              </g>
            )
          })}
          {/* A silver circlet across the brow with ice gems */}
          <rect x={bandL} y="186" width={600 - 2 * bandL} height="20" rx="10" fill={p.steel} stroke="#7D8798" strokeWidth="3" />
          {[226, 300, 374].map((x) => (
            <path key={x} d={`M${x} ${x === 300 ? 170 : 178} L${x + (x === 300 ? 14 : 10)} 196 L${x} ${x === 300 ? 222 : 214} L${x - (x === 300 ? 14 : 10)} 196 Z`} fill="#7DD3FC" stroke="#E0F2FE" strokeWidth="3" strokeLinejoin="round" />
          ))}
          <circle cx="300" cy="196" r="26" fill="#7DD3FC" opacity="0.35" className="cd-glow" />
        </g>
      )
    }
    case 'kitsune': {
      const ear = (
        <g>
          <path d="M148 172 L124 14 Q134 2 148 10 L250 100 Z" fill="#FFF7F2" stroke="#E8B9C9" strokeWidth="5" strokeLinejoin="round" />
          <path d="M160 150 L142 46 L224 112 Z" fill="#FF9CC8" />
          <path d="M124 14 Q134 2 148 10 L170 30 L130 52 Z" fill="#E11D48" />
        </g>
      )
      return (
        <g>
          {/* Fox ears */}
          {ear}
          <g transform="translate(600 0) scale(-1 1)">{ear}</g>
          {/* A festival fox mask worn on the side of the head */}
          <g transform="translate(430 180) rotate(-22) scale(1.4)">
            <path d="M-34 -30 L-30 -66 L-10 -40 Z M34 -30 L30 -66 L10 -40 Z" fill="#FFFFFF" stroke="#E8B9C9" strokeWidth="3" strokeLinejoin="round" />
            <path d="M-44 -6 Q-44 -46 0 -46 Q44 -46 44 -6 Q40 30 0 46 Q-40 30 -44 -6 Z" fill="#FFFFFF" stroke="#E8B9C9" strokeWidth="4" />
            <path d="M-32 -10 Q-20 -22 -8 -12 M32 -10 Q20 -22 8 -12" stroke="#E11D48" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M-26 6 Q-14 2 -6 8 M26 6 Q14 2 6 8" stroke="#1A1D24" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cy="34" r="6" fill="#1A1D24" />
            <circle cy="-32" r="6" fill="#F5C451" />
            <path d="M-38 16 L-58 22 M38 16 L58 22" stroke="#E11D48" strokeWidth="3" strokeLinecap="round" />
          </g>
          {/* Whisker marks on the cheeks */}
          <path d="M170 344 L222 352 M174 366 L222 362 M430 344 L378 352 M426 366 L378 362" stroke="#E11D48" strokeWidth="6" strokeLinecap="round" />
          {/* Fox-fire flickering above the ears */}
          {[96, 504].map((x, i) => (
            <g key={x} transform={`translate(${x} 18)`}>
              <circle cy="-22" r="26" fill="#FF5CA8" opacity="0.3" className="cd-glow" />
              <g className={`cd-flick ${DELAYS[i + 1]}`}>
                <path d={FLAME} fill="#FF5CA8" />
                <path d={FLAME} transform="scale(0.5) translate(0 -2)" fill="#FFFFFF" />
              </g>
            </g>
          ))}
        </g>
      )
    }
    case 'mecha': {
      const finL = edgeX(250, 26) - 14
      return (
        <g>
          {/* Side fins with glowing strips; an antenna blinking on the right */}
          {[-1, 1].map((side) => {
            const x = side < 0 ? finL : 600 - finL - 34
            return (
              <g key={side}>
                <rect x={x} y="190" width="34" height="122" rx="12" fill="#1A1D26" stroke="#2A2F3A" strokeWidth="3" />
                <rect x={x + 14} y="208" width="6" height="86" rx="3" fill="#2DD4BF" className="cd-glow" />
              </g>
            )
          })}
          <path d={`M${600 - finL - 12} 196 L${600 - finL + 6} 110`} stroke="#1A1D26" strokeWidth="6" strokeLinecap="round" />
          <circle cx={600 - finL + 6} cy="106" r="9" fill="#F472B6" className="cd-twinkle" />
          {/* The helmet, with a glowing seam and V crest */}
          <path d={`${headTop(206, 18)} Z`} fill="#1A1D26" stroke="#2A2F3A" strokeWidth="4" />
          <path d="M210 120 Q300 92 390 120" stroke="#3A4152" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d={`M${edgeX(200, 18) + 10} 200 L${600 - edgeX(200, 18) - 10} 200`} stroke="#2DD4BF" strokeWidth="6" strokeLinecap="round" className="cd-glow" />
          <path d="M300 124 Q244 70 214 22 Q266 60 300 96 Q334 60 386 22 Q356 70 300 124 Z" fill="#2DD4BF" stroke="#CCFBF1" strokeWidth="3" strokeLinejoin="round" />
          <path d="M300 128 L312 144 L300 160 L288 144 Z" fill="#F472B6" stroke="#FBCFE8" strokeWidth="2" />
          {/* A HUD lens over the right eye */}
          <path d={`M410 300 L${600 - finL - 10} 280`} stroke="#1A1D26" strokeWidth="8" strokeLinecap="round" />
          <circle cx="368" cy="304" r="48" fill="#5EEAD4" opacity="0.18" stroke="#2DD4BF" strokeWidth="5" />
          <circle cx="368" cy="304" r="58" fill="none" stroke="#CCFBF1" strokeWidth="5" strokeDasharray="4 11" opacity="0.85" className="cd-spin" />
          <circle cx="368" cy="304" r="14" fill="none" stroke="#F472B6" strokeWidth="3" className="cd-glow" />
          <path d="M340 304 L352 304 M384 304 L396 304 M368 276 L368 288 M368 320 L368 332" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    }
    default:
      return null
  }
}

/** The item in the raised hand. */
export function PremiumSkinHeld({ gear, p }: { gear: Gear; p: GearPaint }) {
  switch (gear) {
    case 'frost':
      // An ice scepter: a silver shaft with a snowflake crystal turning on top.
      return (
        <g>
          <rect x="531" y="126" width="16" height="210" rx="7" fill={p.steel} stroke="#7D8798" strokeWidth="2" />
          {[150, 230].map((y) => (
            <rect key={y} x="525" y={y} width="28" height="10" rx="4" fill={p.steel} stroke="#7D8798" strokeWidth="2" />
          ))}
          <circle cx="539" cy="92" r="56" fill="#7DD3FC" opacity="0.3" className="cd-glow" />
          <g className="cd-spin" style={{ animationDuration: '12s' }}>
            <g transform="translate(539 92)">
              <path d={snowflake(44)} stroke="#4AA8E0" strokeWidth="11" strokeLinecap="round" fill="none" />
              <path d={snowflake(44)} stroke="#E0F2FE" strokeWidth="5" strokeLinecap="round" fill="none" />
            </g>
          </g>
          <path d="M539 74 L551 92 L539 112 L527 92 Z" fill="#FFFFFF" stroke="#7DD3FC" strokeWidth="3" />
        </g>
      )
    case 'kitsune':
      // A shrine bell wand: tiers of gold bells, ribbons swaying, a fox-fire on top.
      return (
        <g>
          <rect x="532" y="142" width="14" height="194" rx="6" fill="#C81E4A" stroke="#7A0F2A" strokeWidth="2" />
          <rect x="526" y="134" width="26" height="14" rx="5" fill={p.gold} />
          {[['#FF5CA8', -14], ['#FFFFFF', 0], ['#8B5CF6', 14]].map(([c, a], i) => (
            <g key={c} transform={`rotate(${a} 539 146)`}>
              <g className="cd-sway" style={{ transformOrigin: '539px 146px', animationDelay: `${i * 0.3}s` }}>
                <path d={`M535 146 Q${530 + i * 4} 220 ${528 + i * 6} 300 L${540 + i * 6} 300 Q${542 + i * 4} 220 543 146 Z`} fill={c as string} stroke="#00000022" strokeWidth="1" />
              </g>
            </g>
          ))}
          <path d="M539 132 L539 48" stroke={p.gold} strokeWidth="4" />
          {(
            [
              [124, 7, 40], [100, 5, 28], [78, 3, 16],
            ] as const
          ).flatMap(([y, n, rx]) =>
            Array.from({ length: n }, (_, i) => {
              const x = 539 + (i / (n - 1) - 0.5) * 2 * rx
              return (
                <g key={`${y}-${i}`}>
                  <circle cx={x} cy={y} r="9" fill={p.gold} stroke="#94701F" strokeWidth="2" />
                  <path d={`M${x - 5} ${y + 3} L${x + 5} ${y + 3}`} stroke="#5A4300" strokeWidth="2" />
                </g>
              )
            }),
          )}
          <circle cx="539" cy="56" r="10" fill={p.gold} stroke="#94701F" strokeWidth="2" />
          <circle cx="539" cy="20" r="34" fill="#FF5CA8" opacity="0.3" className="cd-glow" />
          <g transform="translate(539 44)">
            <g className="cd-flick">
              <path d={FLAME} fill="#FF5CA8" />
              <path d={FLAME} transform="scale(0.5) translate(0 -2)" fill="#FFFFFF" />
            </g>
          </g>
        </g>
      )
    case 'mecha':
      // A plasma katana: wrapped hilt, hex guard, a white-hot blade in a teal glow.
      return (
        <g>
          <rect x="530" y="244" width="18" height="92" rx="6" fill="#1A1D26" stroke="#2A2F3A" strokeWidth="2" />
          {[262, 282, 302, 322].map((y) => (
            <rect key={y} x="527" y={y} width="24" height="5" rx="2" fill="#2DD4BF" />
          ))}
          <path d="M539 224 L563 232 L563 248 L539 256 L515 248 L515 232 Z" fill="#1A1D26" stroke="#2DD4BF" strokeWidth="3" strokeLinejoin="round" />
          <g className="cd-glow">
            <rect x="519" y="12" width="40" height="222" rx="20" fill="#2DD4BF" opacity="0.45" filter={`url(#${p.blur})`} />
            <path d="M528 230 L528 30 L539 6 L550 30 L550 230 Z" fill="#5EEAD4" opacity="0.8" />
          </g>
          <path d="M535 228 L535 32 L539 18 L543 32 L543 228 Z" fill="#ECFEFF" />
        </g>
      )
    default:
      return null
  }
}

/** Left-hand items: Neon Ronin's drone hovering by the hand. */
export function PremiumSkinOffhand({ gear }: { gear: Gear }) {
  if (gear !== 'mecha') return null
  return (
    <g className="cd-bob">
      <circle cx="80" cy="344" r="40" fill="#2DD4BF" opacity="0.2" />
      <rect x="28" y="314" width="104" height="8" rx="4" fill="#1A1D26" />
      {[34, 126].map((x) => (
        <ellipse key={x} cx={x} cy="312" rx="26" ry="5" fill="#99F6E4" opacity="0.55" className="cd-glow" />
      ))}
      <ellipse cx="80" cy="346" rx="34" ry="26" fill="#1A1D26" stroke="#2A2F3A" strokeWidth="3" />
      <path d="M46 348 Q80 362 114 348" stroke="#2DD4BF" strokeWidth="3" fill="none" />
      <circle cx="80" cy="342" r="10" fill="#2DD4BF" className="cd-glow" />
      <circle cx="83" cy="339" r="3" fill="#FFFFFF" />
    </g>
  )
}

/** Robes, kimono and armour over the handle. */
export function PremiumSkinBody({ gear, hx, hw, p }: { gear: Gear; hx: number; hw: number; p: GearPaint }) {
  const r = hx + hw
  switch (gear) {
    case 'frost':
      return (
        <g>
          <path d={`M${hx - 14} 500 L${r + 14} 500 L${r + 42} 690 Q300 706 ${hx - 42} 690 Z`} fill="#F1F7FD" stroke="#9CC9EE" strokeWidth="4" strokeLinejoin="round" />
          <path d={`M300 504 L300 696`} stroke="#9CC9EE" strokeWidth="3" />
          <rect x={hx - 22} y="580" width={hw + 44} height="16" rx="6" fill={p.steel} stroke="#7D8798" strokeWidth="2" />
          {[540, 588, 640].map((y) => (
            <path key={y} d={`M300 ${y - 13} L310 ${y} L300 ${y + 13} L290 ${y} Z`} fill="#7DD3FC" stroke="#E0F2FE" strokeWidth="2.5" />
          ))}
          {/* A fluffy fur collar */}
          {Array.from({ length: 6 }, (_, i) => (
            <circle key={i} cx={hx - 22 + (i * (hw + 44)) / 5} cy={496 + (i % 2) * 6} r="20" fill="#FFFFFF" stroke="#D6E2EE" strokeWidth="3" />
          ))}
        </g>
      )
    case 'kitsune':
      return (
        <g>
          <path d={`M${hx - 14} 588 L${r + 14} 588 L${r + 46} 690 Q300 704 ${hx - 46} 690 Z`} fill="#C81E4A" stroke="#7A0F2A" strokeWidth="3" strokeLinejoin="round" />
          {[0.3, 0.5, 0.7].map((k) => (
            <path key={k} d={`M${hx - 14 + (hw + 28) * k} 594 L${hx - 46 + (hw + 92) * k} 690`} stroke="#7A0F2A" strokeWidth="2.5" opacity="0.6" />
          ))}
          <rect x={hx - 10} y="500" width={hw + 20} height="96" rx="14" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="3" />
          <path d={`M${hx - 4} 504 L300 556 L${r + 4} 504`} stroke="#C81E4A" strokeWidth="10" fill="none" />
          {/* A twisted rope belt with paper zigzags */}
          <rect x={hx - 20} y="582" width={hw + 40} height="18" rx="9" fill="#F5E6C8" stroke="#C9B48A" strokeWidth="2" />
          <path d={`M${hx - 12} 584 l8 14 M${hx + 4} 584 l8 14 M${hx + 20} 584 l8 14 M${r - 28} 584 l8 14 M${r - 12} 584 l8 14 M${r + 4} 584 l8 14`} stroke="#C9B48A" strokeWidth="2.5" />
          <circle cx="300" cy="591" r="13" fill="#F5E6C8" stroke="#C9B48A" strokeWidth="2.5" />
          {[272, 316].map((x) => (
            <path key={x} d={`M${x} 600 l12 0 l0 14 l6 0 l0 14 l-6 0 l0 14 l6 0 l0 14 l-12 0 l0 -14 l-6 0 l0 -14 l6 0 l0 -14 l-6 0 Z`} fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1.5" />
          ))}
        </g>
      )
    case 'mecha':
      return (
        <g>
          {[-1, 1].map((side) => {
            const x = side < 0 ? hx - 26 : r + 26
            return (
              <g key={side} transform={`rotate(${side * 18} ${x} 500)`}>
                <rect x={x - 38} y="484" width="76" height="34" rx="10" fill="#1A1D26" stroke="#2A2F3A" strokeWidth="3" />
                <rect x={x - 30} y="510" width="60" height="5" rx="2" fill="#2DD4BF" />
              </g>
            )
          })}
          <rect x={hx - 12} y="500" width={hw + 24} height="112" rx="14" fill="#1A1D26" stroke="#2A2F3A" strokeWidth="3" />
          <path d={`M${hx + 6} 560 L${hx + 6} 590 L${hx + 22} 600 M${r - 6} 560 L${r - 6} 590 L${r - 22} 600`} stroke="#2DD4BF" strokeWidth="4" fill="none" strokeLinejoin="round" className="cd-glow" />
          <circle cx="300" cy="536" r="22" fill="#2DD4BF" opacity="0.25" />
          <circle cx="300" cy="536" r="14" fill="#F472B6" stroke="#2DD4BF" strokeWidth="4" className="cd-glow" />
          <rect x={hx - 14} y="596" width={hw + 28} height="16" rx="5" fill="#2A2F3A" />
          <rect x="286" y="597" width="28" height="14" rx="4" fill="#2DD4BF" />
        </g>
      )
    default:
      return null
  }
}
