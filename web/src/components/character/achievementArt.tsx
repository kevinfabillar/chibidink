import type { Gear } from '../../cosmetics/visuals'
import { edgeX, headTop } from './characterArt'
import type { GearPaint } from './gearArt'
import { KUDOS_SKIN_GEARS, KUDOS_SKIN_GLOW, type KudosSkinGear, KudosSkinBackdrop, KudosSkinBody, KudosSkinHat, KudosSkinHeld, KudosSkinOffhand } from './kudosSkinsArt'

// The achievement skins in 2D (same design coordinates as gearArt.tsx; head x 120..480, y 80..490,
// raised hand at 539,294, other hand at 85,430). The 3D versions are in character3d/achievement.ts.

export const ACHIEVEMENT_GEARS: Gear[] = ['butler', 'aegis', 'racer', 'shade', 'clockwork', ...KUDOS_SKIN_GEARS]
export const isAchievementGear = (gear: Gear) => ACHIEVEMENT_GEARS.includes(gear)

/** Where the held item's effect glows: [cx, cy, rx, ry]. */
export const ACH_GLOW: Record<'butler' | 'aegis' | 'racer' | 'shade' | 'clockwork' | KudosSkinGear, [number, number, number, number]> = {
  ...KUDOS_SKIN_GLOW,
  butler: [539, 220, 80, 56],
  aegis: [539, 200, 56, 56],
  racer: [539, 210, 60, 70],
  shade: [539, 100, 34, 190],
  clockwork: [539, 190, 60, 60],
}

/** A rounded rectangle as path commands (no Z). */
const roundRect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y} L${x + w - r} ${y} A${r} ${r} 0 0 1 ${x + w} ${y + r} L${x + w} ${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} L${x + r} ${y + h} A${r} ${r} 0 0 1 ${x} ${y + h - r} L${x} ${y + r} A${r} ${r} 0 0 1 ${x + r} ${y}`

const CHECKER = (x: number, y: number, cols: number, rows: number, k: number) =>
  Array.from({ length: cols * rows }, (_, i) => {
    const cx = i % cols
    const cy = Math.floor(i / cols)
    return (cx + cy) % 2 ? null : <rect key={i} x={x + cx * k} y={y + cy * k} width={k} height={k} fill="#111317" />
  })

/** A cog centred on (cx, cy). */
function Cog({ cx, cy, r, teeth, fill, spin }: { cx: number; cy: number; r: number; teeth: number; fill: string; spin?: number }) {
  const pts = Array.from({ length: teeth * 4 }, (_, i) => {
    const a = (i / (teeth * 4)) * Math.PI * 2
    const rr = i % 4 < 2 ? r : r * 0.82
    return `${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`
  })
  return (
    <g>
      <path d={`M${pts.join(' L')} Z M${cx + r * 0.32} ${cy} a${r * 0.32} ${r * 0.32} 0 1 0 ${-r * 0.64} 0 a${r * 0.32} ${r * 0.32} 0 1 0 ${r * 0.64} 0 Z`} fill={fill} fillRule="evenodd" stroke="#5A3A12" strokeWidth="2" />
      {spin !== undefined && <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`${spin > 0 ? 360 : -360} ${cx} ${cy}`} dur={`${Math.abs(spin)}s`} repeatCount="indefinite" />}
    </g>
  )
}

/** Each skin's own backdrop, drawn behind the premium glow. */
export function AchBackdrop({ gear }: { gear: Gear }) {
  const rays = (color: string, n: number, dur: number) => (
    <g opacity="0.22">
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d="M300 400 L290 -40 L310 -40 Z" fill={color} transform={`rotate(${(i * 360) / n} 300 400)`} />
      ))}
      <animateTransform attributeName="transform" type="rotate" from="0 300 400" to="360 300 400" dur={`${dur}s`} repeatCount="indefinite" />
    </g>
  )
  switch (gear) {
    case 'butler':
      return (
        <g>
          {rays('#F5C451', 14, 60)}
          <ellipse cx="300" cy="736" rx="170" ry="26" fill="#FDE68A" opacity="0.35" />
        </g>
      )
    case 'aegis': {
      const hexes = []
      const s = 34
      for (let row = -7; row <= 7; row++)
        for (let col = -6; col <= 6; col++) {
          const x = 300 + col * s * 1.73 + (row % 2 ? s * 0.866 : 0)
          const y = 400 + row * s * 1.5
          if (Math.hypot(x - 300, (y - 400) * 0.9) > 250) continue
          const d = Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 + Math.PI / 6
            return `${(x + Math.cos(a) * s).toFixed(1)} ${(y + Math.sin(a) * s).toFixed(1)}`
          })
          hexes.push(<path key={`${row}-${col}`} d={`M${d.join(' L')} Z`} />)
        }
      return (
        <g fill="none" stroke="#7DD3FC" strokeWidth="2" opacity="0.5" className="cd-glow">
          {hexes}
        </g>
      )
    }
    case 'racer':
      return (
        <g>
          {rays('#EF4444', 18, 24)}
          {[-1, 1].map((side) => (
            <g key={side} transform={side < 0 ? undefined : 'translate(600 0) scale(-1 1)'}>
              <path d="M70 40 L70 330" stroke="#C9D1DC" strokeWidth="5" strokeLinecap="round" />
              <g transform="translate(72 42)">
                <rect width="120" height="80" fill="#F4F6F9" />
                {CHECKER(0, 0, 6, 4, 20)}
              </g>
            </g>
          ))}
        </g>
      )
    case 'shade': {
      const sword = (angle: number, key: string) => (
        <g key={key} transform={`rotate(${angle} 300 400)`}>
          <path d="M292 380 L308 380 L306 150 L300 126 L294 150 Z" fill="#A78BFA" stroke="#EDE9FE" strokeWidth="2" strokeLinejoin="round" opacity="0.9" />
          <rect x="280" y="378" width="40" height="8" rx="3" fill="#14101F" />
        </g>
      )
      return (
        <g>
          <g className="cd-glow">{[-115, -88, -61, -34, 34, 61, 88, 115].map((a) => sword(a, String(a)))}</g>
          <g stroke="#E9DDFF" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round">
            <path d="M96 120 L130 190 L104 210 L150 300" className="cd-twinkle" />
            <path d="M520 160 L486 240 L514 256 L466 350" className="cd-twinkle cd-d2" />
            <path d="M70 420 L120 470 L96 500 L140 560" className="cd-twinkle cd-d3" />
            <path d="M540 470 L500 520 L524 540 L476 600" className="cd-twinkle cd-d1" />
          </g>
          <ellipse cx="300" cy="740" rx="150" ry="22" fill="none" stroke="#8B5CF6" strokeWidth="4" />
          <ellipse cx="300" cy="740" rx="112" ry="16" fill="none" stroke="#C4B5FD" strokeWidth="2" strokeDasharray="10 8" />
          {[220, 260, 300, 340, 380].map((x, i) => (
            <path key={x} d={`M${x} 742 q-14 -26 0 -54 q14 28 0 54 Z`} fill={i % 2 ? '#A78BFA' : '#7C3AED'} opacity="0.75" className={`cd-twinkle cd-d${(i % 3) + 1}`} />
          ))}
        </g>
      )
    }
    case 'clockwork':
      return (
        <g>
          <circle cx="300" cy="380" r="250" fill="none" stroke="#C8943A" strokeWidth="6" opacity="0.6" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="297" y={i % 3 ? 136 : 128} width="6" height={i % 3 ? 16 : 28} fill="#C8943A" opacity="0.7" transform={`rotate(${i * 30} 300 380)`} />
          ))}
          <Cog cx={150} cy={250} r={90} teeth={14} fill="#B8863B" spin={24} />
          <Cog cx={470} cy={210} r={68} teeth={11} fill="#C8943A" spin={-18} />
          <Cog cx={420} cy={560} r={56} teeth={9} fill="#A87730" spin={14} />
          <Cog cx={170} cy={590} r={44} teeth={8} fill="#C8943A" spin={-10} />
        </g>
      )
    default:
      return <KudosSkinBackdrop gear={gear} />
  }
}

/** Hats, helmets and what's worn on the face. Drawn over the face. */
export function AchHat({ gear, p }: { gear: Gear; p: GearPaint }) {
  switch (gear) {
    case 'butler':
      return (
        <g>
          <g transform="rotate(-6 312 92)">
            <path d="M232 -50 L392 -50 L386 86 L238 86 Z" fill="#15171C" />
            <path d="M246 -42 L262 -42 L258 80 L250 80 Z" fill="#FFFFFF" opacity="0.12" />
            <rect x="236" y="58" width="152" height="24" fill="#9E1B2B" />
            <rect x="300" y="60" width="26" height="20" rx="3" fill={p.gold} />
            <ellipse cx="312" cy="92" rx="122" ry="17" fill="#15171C" />
          </g>
          {/* Monocle and chain */}
          <circle cx="368" cy="304" r="42" fill="#FFF7D6" opacity="0.2" stroke={p.gold} strokeWidth="8" />
          <path d="M404 326 Q436 390 452 448" stroke={p.gold} strokeWidth="3" fill="none" />
          {/* Mustache */}
          <path d="M300 344 Q262 372 230 350 Q218 338 228 324 Q238 344 262 346 Q284 348 300 334 Q316 348 338 346 Q362 344 372 324 Q382 338 370 350 Q338 372 300 344 Z" fill="#3B2416" />
        </g>
      )
    case 'aegis':
      return (
        <g>
          <path d={`${headTop(250, 18)} Z`} fill={p.steel} stroke="#5A6476" strokeWidth="3" />
          <path d={`M${edgeX(250, 18)} 250 L${edgeX(250, 18)} 400 Q132 412 150 380 L150 250 Z`} fill={p.steel} stroke="#5A6476" strokeWidth="3" />
          <path d={`M${600 - edgeX(250, 18)} 250 L${600 - edgeX(250, 18)} 400 Q468 412 450 380 L450 250 Z`} fill={p.steel} stroke="#5A6476" strokeWidth="3" />
          <rect x={edgeX(250, 18)} y="238" width={600 - 2 * edgeX(250, 18)} height="22" rx="8" fill={p.gold} />
          {[250, 300, 350].map((x) => (
            <rect key={x} x={x - 20} y="22" width="40" height="44" rx="5" fill={p.steel} stroke="#5A6476" strokeWidth="3" />
          ))}
          <path d="M276 128 L324 128 L324 158 Q322 178 300 190 Q278 178 276 158 Z" fill="#2B4FA0" stroke={p.gold} strokeWidth="4" />
          <path d="M300 136 L300 182 M282 150 L318 150" stroke="#E6C46A" strokeWidth="3" />
          {/* Energy band across the brow and a glow over the crest */}
          <rect x={edgeX(262, 18)} y="260" width={600 - 2 * edgeX(262, 18)} height="6" rx="3" fill="#38BDF8" className="cd-glow" />
          <circle cx="300" cy="158" r="30" fill="#7DD3FC" opacity="0.35" className="cd-glow" />
          <ellipse cx="300" cy="10" rx="40" ry="34" fill="#38BDF8" opacity="0.3" className="cd-glow" />
        </g>
      )
    case 'racer': {
      const e = 24
      const l = 120 - e
      // Full-face shell: the grown head outline (a rounded rectangle) with the visor window cut out (even-odd fill).
      const shell = roundRect(l, 80 - e, 360 + e * 2, 410 + e * 2, 150 + e)
      return (
        <g>
          {/* Gold halo floating above */}
          <ellipse cx="300" cy="24" rx="92" ry="20" fill="none" stroke="#FDE68A" strokeWidth="14" opacity="0.35" />
          <ellipse cx="300" cy="24" rx="92" ry="20" fill="none" stroke={p.gold} strokeWidth="8" />
          <path d={`${shell} Z M140 228 L460 228 Q470 228 470 240 L470 340 Q470 352 458 352 L142 352 Q130 352 130 340 L130 240 Q130 228 140 228 Z`} fill="#D61F2C" fillRule="evenodd" stroke="#8E1019" strokeWidth="3" />
          {/* Gloss and the white stripe over the top */}
          <path d="M170 160 Q220 96 290 90" stroke="#FFFFFF" strokeWidth="14" fill="none" opacity="0.35" strokeLinecap="round" />
          <rect x="288" y={80 - e} width="24" height={228 - 80 + e} rx="6" fill="#F4F6F9" />
          {/* Visor with its gold frame and reflections */}
          <rect x="130" y="228" width="340" height="124" rx="14" fill="#FB923C" opacity="0.72" />
          <rect x="130" y="228" width="340" height="124" rx="14" fill="none" stroke={p.gold} strokeWidth="8" />
          <path d="M176 340 L226 240 M212 344 L250 262 M390 338 L432 252" stroke="#FFFFFF" strokeWidth="9" opacity="0.5" strokeLinecap="round" />
          {/* Checkered side panels, chin vents and the 01 plate */}
          <g>
            {CHECKER(l + 2, 240, 2, 4, 11)}
            {CHECKER(600 - l - 24, 240, 2, 4, 11)}
          </g>
          {[282, 300, 318].map((x) => (
            <rect key={x} x={x - 5} y="374" width="10" height="22" rx="4" fill="#15171C" />
          ))}
          <rect x="262" y="414" width="76" height="40" rx="8" fill={p.gold} />
          <text x="300" y="444" textAnchor="middle" fontSize="30" fontWeight="800" fill="#3B2A06" fontFamily="system-ui, sans-serif">
            01
          </text>
        </g>
      )
    }
    case 'shade':
      return (
        <g>
          {/* Blade fins sweeping back from the temples */}
          <path d={`M${edgeX(205, 14)} 200 L${edgeX(205, 14) - 70} 150 L${edgeX(205, 14) - 6} 220 Z`} fill="#A78BFA" stroke="#EDE9FE" strokeWidth="2" strokeLinejoin="round" />
          <path d={`M${600 - edgeX(205, 14)} 200 L${600 - edgeX(205, 14) + 70} 150 L${600 - edgeX(205, 14) + 6} 220 Z`} fill="#A78BFA" stroke="#EDE9FE" strokeWidth="2" strokeLinejoin="round" />
          {/* Crown spikes */}
          <path
            d="M200 188 L206 140 L224 184 Z M244 182 L248 112 L270 178 Z M286 178 L300 44 L314 178 Z M330 178 L352 112 L356 182 Z M376 184 L394 140 L400 188 Z"
            fill="#8B5CF6"
            stroke="#C4B5FD"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Gold-trimmed band */}
          <path d={`M${edgeX(185, 14)} 182 Q300 160 ${600 - edgeX(185, 14)} 182 L${600 - edgeX(225, 14)} 226 Q300 204 ${edgeX(225, 14)} 226 Z`} fill="#14101F" />
          <path d={`M${edgeX(185, 14)} 182 Q300 160 ${600 - edgeX(185, 14)} 182 M${edgeX(225, 14)} 226 Q300 204 ${600 - edgeX(225, 14)} 226`} stroke={p.gold} strokeWidth="5" fill="none" />
          {[212, 256, 344, 388].map((x) => (
            <path key={x} d={`M${x} 196 l6 8 l-6 8 l-6 -8 Z`} fill="#EDE9FE" />
          ))}
          <circle cx="300" cy="200" r="34" fill="#8B5CF6" opacity="0.35" />
          <path d="M300 176 L318 202 L300 228 L282 202 Z" fill="#C4B5FD" stroke="#FFFFFF" strokeWidth="2" />
        </g>
      )
    case 'clockwork':
      return (
        <g>
          <g transform="rotate(-5 306 94)">
            <path d="M226 -14 L386 -14 L380 88 L232 88 Z" fill="#3B2A1A" />
            <rect x="230" y="60" width="152" height="22" fill="#C8943A" />
            <Cog cx={360} cy={30} r={30} teeth={10} fill="#C8943A" />
            <ellipse cx="306" cy="94" rx="118" ry="16" fill="#3B2A1A" />
          </g>
          <path d={`M${edgeX(190, 12)} 190 L${600 - edgeX(190, 12)} 190`} stroke="#3B2A1A" strokeWidth="10" />
          {[236, 364].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="190" r="40" fill="#F59E0B" opacity="0.75" stroke="#C8943A" strokeWidth="10" />
              <path d={`M${cx - 18} 178 Q${cx - 6} 166 ${cx + 8} 170`} stroke="#FFFFFF" strokeWidth="5" fill="none" opacity="0.7" strokeLinecap="round" />
            </g>
          ))}
          <rect x="276" y="184" width="48" height="12" rx="4" fill="#C8943A" />
        </g>
      )
    default:
      return <KudosSkinHat gear={gear} p={p} />
  }
}

/** The item in the raised hand. */
export function AchHeld({ gear, p }: { gear: Gear; p: GearPaint }) {
  switch (gear) {
    case 'butler':
      return (
        <g transform="rotate(20 539 294)">
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${516 + i * 22} 150 q-10 -16 0 -32 q10 -16 0 -32`} stroke="#FFFFFF" strokeWidth="4" fill="none" opacity="0.55" strokeLinecap="round" className={`cd-twinkle cd-d${i + 1}`} />
          ))}
          <path d="M478 252 Q478 176 539 172 Q600 176 600 252 Z" fill={p.steel} stroke="#8D97A8" strokeWidth="3" />
          <path d="M496 236 Q498 196 530 186" stroke="#FFFFFF" strokeWidth="6" fill="none" opacity="0.7" strokeLinecap="round" />
          <circle cx="539" cy="168" r="10" fill={p.steel} stroke="#8D97A8" strokeWidth="2" />
          <ellipse cx="539" cy="256" rx="80" ry="13" fill={p.steel} stroke="#8D97A8" strokeWidth="3" />
        </g>
      )
    case 'aegis':
      return (
        <g>
          <path d="M539 150 L578 172 L578 216 L539 238 L500 216 L500 172 Z" fill="#60A5FA" stroke="#DBEAFE" strokeWidth="4" opacity="0.92" />
          <path d="M520 178 L539 166 L558 178" stroke="#FFFFFF" strokeWidth="4" fill="none" opacity="0.7" />
          <path d="M586 246 L604 256 L604 276 L586 286 L568 276 L568 256 Z" fill="#60A5FA" stroke="#DBEAFE" strokeWidth="3" opacity="0.85" />
        </g>
      )
    case 'racer':
      return (
        <g>
          <path d="M490 150 L588 150 Q590 220 552 240 L546 262 L532 262 L526 240 Q488 220 490 150 Z" fill={p.gold} stroke="#94701F" strokeWidth="3" />
          <path d="M490 160 Q456 166 466 196 Q474 214 496 212 M588 160 Q622 166 612 196 Q604 214 582 212" stroke={p.gold} strokeWidth="8" fill="none" />
          <path d="M539 176 l7 15 l16 2 l-12 11 l3 16 l-14 -8 l-14 8 l3 -16 l-12 -11 l16 -2 Z" fill="#FFF4C2" />
          <rect x="514" y="262" width="50" height="26" rx="4" fill="#15171C" />
        </g>
      )
    case 'shade':
      return (
        <g transform="rotate(8 539 294)">
          <path d="M539 330 L550 342 L539 354 L528 342 Z" fill="#C4B5FD" />
          <rect x="531" y="276" width="16" height="56" rx="6" fill="#14101F" />
          <path d="M539 268 Q510 268 486 238 Q514 252 539 256 Q564 252 592 238 Q568 268 539 268 Z" fill="#6D28D9" stroke="#C4B5FD" strokeWidth="2" />
          <path d="M526 256 L552 256 L550 -40 L539 -76 L528 -40 Z" fill="#8B5CF6" stroke="#EDE9FE" strokeWidth="3" strokeLinejoin="round" />
          <path d="M535 250 L543 250 L542 -36 L539 -60 L536 -36 Z" fill="#F5F3FF" opacity="0.9" />
          <circle cx="539" cy="262" r="7" fill="#EDE9FE" />
        </g>
      )
    case 'clockwork':
      return (
        <g>
          <rect x="532" y="170" width="14" height="124" rx="5" fill="#C8943A" stroke="#5A3A12" strokeWidth="2" />
          <circle cx="512" cy="152" r="26" fill="none" stroke="#C8943A" strokeWidth="12" />
          <circle cx="566" cy="152" r="26" fill="none" stroke="#C8943A" strokeWidth="12" />
          <circle cx="539" cy="162" r="11" fill="#C8943A" />
          <rect x="544" y="280" width="26" height="16" rx="3" fill="#C8943A" />
        </g>
      )
    default:
      return <KudosSkinHeld gear={gear} />
  }
}

/** Left-hand items: the butler's notepad and the Aegis tower shield. */
export function AchOffhand({ gear, p }: { gear: Gear; p: GearPaint }) {
  if (gear === 'butler')
    return (
      <g transform="rotate(16 85 420)">
        <rect x="58" y="366" width="54" height="72" rx="5" fill="#FFFFFF" stroke="#C9CED6" strokeWidth="2" />
        <path d="M66 384 L104 384 M66 398 L104 398 M66 412 L96 412" stroke="#9AA3B2" strokeWidth="3" />
        <path d="M108 360 L122 446" stroke="#15171C" strokeWidth="5" strokeLinecap="round" />
      </g>
    )
  if (gear === 'aegis')
    return (
      <g>
        <path d="M30 340 L162 340 L162 470 Q160 538 96 568 Q32 538 30 470 Z" fill="#24418A" stroke={p.gold} strokeWidth="9" strokeLinejoin="round" />
        <path d="M96 352 L96 552 M42 420 L150 420" stroke={p.gold} strokeWidth="7" />
        <path d="M96 404 L112 420 L96 436 L80 420 Z" fill="#7DD3FC" stroke="#FFFFFF" strokeWidth="2" />
        {/* Energy edge and glow */}
        <path d="M24 334 L168 334 L168 470 Q166 544 96 576 Q26 544 24 470 Z" fill="none" stroke="#38BDF8" strokeWidth="4" className="cd-glow" />
        <circle cx="96" cy="420" r="26" fill="#7DD3FC" opacity="0.35" className="cd-glow" />
      </g>
    )
  return <KudosSkinOffhand gear={gear} />
}

/** Suits, armor and robes over the handle. */
export function AchBody({ gear, hx, hw, p }: { gear: Gear; hx: number; hw: number; p: GearPaint }) {
  const r = hx + hw
  switch (gear) {
    case 'butler':
      return (
        <g>
          <path d={`M${hx - 20} 640 L${hx - 6} 600 L${hx + 10} 640 Z M${r + 20} 640 L${r + 6} 600 L${r - 10} 640 Z`} fill="#15171C" />
          <rect x={hx - 10} y="500" width={hw + 20} height="108" rx="14" fill="#15171C" />
          <path d={`M${hx + 4} 504 L300 556 L${r - 4} 504`} stroke="#2A2D33" strokeWidth="6" fill="none" />
          <path d={`M288 504 L312 504 L310 600 L290 600 Z`} fill="#FFFFFF" />
          {[528, 552, 576].map((y) => (
            <circle key={y} cx="300" cy={y} r="5" fill={p.gold} />
          ))}
          <path d="M300 500 L272 486 L272 514 Z M300 500 L328 486 L328 514 Z" fill="#15171C" />
          <circle cx="300" cy="500" r="7" fill="#2A2D33" />
          <path d="M344 510 L352 520 L340 520 Z" fill={p.gold} />
        </g>
      )
    case 'aegis':
      return (
        <g>
          <ellipse cx={hx - 18} cy="500" rx="34" ry="22" fill={p.steel} stroke="#5A6476" strokeWidth="3" />
          <ellipse cx={r + 18} cy="500" rx="34" ry="22" fill={p.steel} stroke="#5A6476" strokeWidth="3" />
          <rect x={hx - 12} y="500" width={hw + 24} height="104" rx="16" fill={p.steel} stroke="#5A6476" strokeWidth="3" />
          <path d="M284 520 L316 520 L316 540 Q314 556 300 562 Q286 556 284 540 Z" fill="#2B4FA0" stroke={p.gold} strokeWidth="3" />
          <rect x={hx - 14} y="590" width={hw + 28} height="14" rx="5" fill={p.gold} />
        </g>
      )
    case 'racer':
      return (
        <g>
          <rect x={hx - 10} y="500" width={hw + 20} height="118" rx="14" fill="#D61F2C" />
          <rect x={hx - 6} y="504" width="8" height="110" fill="#FFFFFF" opacity="0.85" />
          <rect x={r - 2} y="504" width="8" height="110" fill="#FFFFFF" opacity="0.85" />
          <rect x={hx - 10} y="576" width={hw + 20} height="12" fill={p.gold} />
          <g>{CHECKER(hx - 8, 500, Math.ceil((hw + 16) / 8), 1, 8)}</g>
          <rect x="304" y="518" width="30" height="18" rx="3" fill="#15171C" />
          <text x="319" y="532" textAnchor="middle" fontSize="13" fontWeight="800" fill="#FFFFFF" fontFamily="system-ui, sans-serif">
            01
          </text>
        </g>
      )
    case 'shade':
      return (
        <g>
          <path d={`M${hx - 14} 500 L${r + 14} 500 L${r + 50} 694 Q300 712 ${hx - 50} 694 Z`} fill="#14101F" stroke="#8B5CF6" strokeWidth="4" />
          <path d={`M${hx - 46} 686 Q300 704 ${r + 46} 686`} stroke="#C4B5FD" strokeWidth="3" fill="none" />
          <rect x={hx - 22} y="556" width={hw + 44} height="10" fill="#8B5CF6" />
          {[-1, 1].map((side) => {
            const x = side < 0 ? hx - 20 : r + 20
            return (
              <g key={side}>
                <ellipse cx={x} cy="502" rx="34" ry="20" fill="#1E1433" stroke="#8B5CF6" strokeWidth="3" />
                <path d={`M${x + side * 8} 490 L${x + side * 40} 456 L${x + side * 22} 494 Z`} fill="#A78BFA" />
              </g>
            )
          })}
          <path d="M300 494 L316 512 L300 532 L284 512 Z" fill="#C4B5FD" stroke="#FFFFFF" strokeWidth="2" />
        </g>
      )
    case 'clockwork':
      return (
        <g>
          <rect x={hx - 10} y="500" width={hw + 20} height="100" rx="12" fill="#5A3A1E" />
          <path d={`M${hx - 6} 504 L300 560 L${r + 6} 504`} stroke="#3B2A1A" strokeWidth="6" fill="none" />
          {[526, 552, 578].map((y) => (
            <circle key={y} cx="300" cy={y} r="5" fill="#C8943A" />
          ))}
          <path d={`M300 552 Q${r} 560 ${r + 4} 584`} stroke="#C8943A" strokeWidth="3" fill="none" />
          <circle cx={r + 6} cy="592" r="16" fill="#FFF7E0" stroke="#C8943A" strokeWidth="5" />
          <path d={`M${r + 6} 592 L${r + 6} 582 M${r + 6} 592 L${r + 14} 596`} stroke="#3B2A1A" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    default:
      return <KudosSkinBody gear={gear} hx={hx} hw={hw} p={p} />
  }
}
