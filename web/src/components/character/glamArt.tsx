import type { Gear, Hair } from '../../cosmetics/visuals'
import { shade } from '../../lib/color'
import { useSvgIds } from '../../lib/svgIds'
import { edgeX, headTop, heart } from './characterArt'
import type { GearPaint } from './gearArt'

// The Glam outfits (Princess, Fairy, Pop Idol, Sakura) and the hair that comes with them, in the
// same design coordinates as gearArt.tsx. The 3D versions are in character3d/glam.ts.

const LONG = 'M150 170 Q70 330 104 600 Q150 646 200 606 Q250 634 300 604 Q350 634 400 606 Q450 646 496 600 Q530 330 450 170 Z'
const BOB = 'M300 56 Q90 56 92 260 Q88 404 142 456 Q118 412 122 380 Q300 380 478 380 Q482 412 458 456 Q512 404 508 260 Q510 56 300 56 Z'
const PIGTAIL_L = 'M150 190 Q60 210 62 330 Q60 430 30 486 Q100 470 116 380 Q128 290 168 236 Z'
const PIGTAIL_R = 'M450 190 Q540 210 538 330 Q540 430 570 486 Q500 470 484 380 Q472 290 432 236 Z'
/** Bangs over the top of the face, with side locks framing it. */
const BANGS = `${headTop(300, 10)} Q470 250 452 196 Q420 228 380 190 Q350 226 300 186 Q250 226 220 190 Q180 228 148 196 Q130 250 ${edgeX(300, 10)} 300 Z`

function HairPaint({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor={shade(color, 0.3)} />
        <stop offset="0.5" stopColor={color} />
        <stop offset="1" stopColor={shade(color, -0.35)} />
      </linearGradient>
    </defs>
  )
}

/** Hair behind the head: long waves, a bob, pigtails or a bun. */
export function HairBack({ hair }: { hair: Hair }) {
  const ids = useSvgIds('hair')
  const f = `url(#${ids.hair})`
  const edge = shade(hair.color, -0.45)
  return (
    <g>
      <HairPaint id={ids.hair} color={hair.color} />
      {hair.style === 'long' && <path d={LONG} fill={f} stroke={edge} strokeWidth="3" strokeLinejoin="round" />}
      {hair.style === 'bob' && <path d={BOB} fill={f} stroke={edge} strokeWidth="3" strokeLinejoin="round" />}
      {hair.style === 'pigtails' && (
        <g stroke={edge} strokeWidth="3" strokeLinejoin="round">
          <path d={PIGTAIL_L} fill={f} />
          <path d={PIGTAIL_R} fill={f} />
        </g>
      )}
      {hair.style === 'bun' && (
        <g>
          <circle cx="300" cy="52" r="58" fill={f} stroke={edge} strokeWidth="3" />
          <path d="M262 40 Q300 10 338 40" stroke="#FFFFFF" strokeWidth="6" fill="none" opacity="0.3" strokeLinecap="round" />
        </g>
      )}
    </g>
  )
}

/** Bangs, drawn over the face (hats and tiaras go on top). */
export function HairFront({ hair }: { hair: Hair }) {
  const ids = useSvgIds('hair')
  return (
    <g>
      <HairPaint id={ids.hair} color={hair.color} />
      <path d={BANGS} fill={`url(#${ids.hair})`} stroke={shade(hair.color, -0.45)} strokeWidth="3" strokeLinejoin="round" />
      <path d="M190 118 Q240 88 300 84" stroke="#FFFFFF" strokeWidth="12" fill="none" opacity="0.35" strokeLinecap="round" />
      {hair.style === 'pigtails' && (
        <g fill={hair.accent ?? '#FF5CA8'}>
          <circle cx="140" cy="206" r="16" />
          <circle cx="460" cy="206" r="16" />
        </g>
      )}
    </g>
  )
}

function Flower({ cx, cy, r, color, center = '#FDE047' }: { cx: number; cy: number; r: number; color: string; center?: string }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((deg) => {
        const t = (deg * Math.PI) / 180
        return <circle key={deg} cx={cx + Math.sin(t) * r * 0.6} cy={cy - Math.cos(t) * r * 0.6} r={r * 0.55} fill={color} stroke={shade(color, -0.25)} strokeWidth="1.5" />
      })}
      <circle cx={cx} cy={cy} r={r * 0.35} fill={center} />
    </g>
  )
}

/** Fairy wings, behind everything. */
export function GlamBack({ gear }: { gear: Gear }) {
  if (gear !== 'fairy') return null
  const wing = (
    <g fill="#A9EFE3" fillOpacity="0.72" stroke="#4FBFAE" strokeWidth="3" strokeLinejoin="round">
      <path d="M262 410 Q150 230 66 280 Q30 370 140 428 Z" />
      <path d="M262 440 Q120 470 100 548 Q170 590 262 460 Z" />
      <path d="M250 414 Q170 330 96 316 M248 446 Q170 490 128 540" fill="none" stroke="#FFFFFF" strokeOpacity="0.7" />
    </g>
  )
  return (
    <g className="cd-flap">
      {wing}
      <g transform="translate(600 0) scale(-1 1)">{wing}</g>
    </g>
  )
}

/** Skirts, gowns and the kimono with its obi, worn over the handle. */
export function GlamBody({ gear, hx, hw, p }: { gear: Gear; hx: number; hw: number; p: GearPaint }) {
  const r = hx + hw
  switch (gear) {
    case 'princess':
      return (
        <g>
          <path d={`M${hx - 6} 512 Q${hx - 56} 590 ${hx - 96} 664 Q300 700 ${r + 96} 664 Q${r + 56} 590 ${r + 6} 512 Z`} fill="#F59AC7" stroke="#C2266F" strokeWidth="3" strokeLinejoin="round" />
          <path d={`M${hx - 20} 560 Q${hx - 40} 620 ${hx - 60} 670 M300 530 L300 690 M${r + 20} 560 Q${r + 40} 620 ${r + 60} 670`} stroke="#FFFFFF" strokeWidth="5" opacity="0.35" fill="none" strokeLinecap="round" />
          <path d={`M${hx - 96} 664 Q300 700 ${r + 96} 664`} stroke="#FFE3F0" strokeWidth="10" fill="none" strokeLinecap="round" />
          <rect x={hx - 8} y="506" width={hw + 16} height="16" rx="6" fill={p.gold} />
          <path d={heart(300, 514, 9)} fill="#FF5CA8" />
        </g>
      )
    case 'fairy':
      return (
        <path
          d={`M${hx - 8} 514 L${r + 8} 514 L${r + 30} 592 L${r - 6} 574 L320 602 L300 578 L280 602 L${hx + 6} 574 L${hx - 30} 592 Z`}
          fill="#6CC487"
          stroke="#3E8F57"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )
    case 'idol':
      return (
        <g>
          <path d={`M${hx - 8} 512 L${r + 8} 512 L${r + 50} 598 Q300 616 ${hx - 50} 598 Z`} fill="#B66CF2" stroke="#7A3FB8" strokeWidth="3" strokeLinejoin="round" />
          <path d={`M${hx + 10} 520 L${hx - 22} 600 M300 520 L300 608 M${r - 10} 520 L${r + 22} 600`} stroke="#7A3FB8" strokeWidth="3" opacity="0.6" />
          <path d={`M${hx - 50} 598 Q300 616 ${r + 50} 598`} stroke="#FFFFFF" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M300 504 l5 11 l12 1 l-9 8 l3 12 l-11 -6 l-11 6 l3 -12 l-9 -8 l12 -1 Z" fill="#FDE047" />
        </g>
      )
    case 'sakura':
      return (
        <g>
          <path d={`M${hx - 16} 512 L${r + 16} 512 L${r + 34} 690 Q300 700 ${hx - 34} 690 Z`} fill="#F4A6C0" stroke="#C2647F" strokeWidth="3" strokeLinejoin="round" />
          <Flower cx={256} cy={612} r={14} color="#FFFFFF" center="#F7C6D6" />
          <Flower cx={340} cy={650} r={12} color="#FFFFFF" center="#F7C6D6" />
          <Flower cx={318} cy={584} r={10} color="#FFFFFF" center="#F7C6D6" />
          <rect x={hx - 20} y="516" width={hw + 40} height="42" rx="8" fill="#C2334D" />
          <path d={`M${hx - 20} 537 L${r + 20} 537`} stroke={p.gold} strokeWidth="4" />
          <rect x="288" y="524" width="24" height="26" rx="6" fill="#8E1B2B" />
        </g>
      )
    default:
      return null
  }
}

/** Tiara, flower crown, hair bow and kanzashi pins, drawn over the bangs. */
export function GlamHat({ gear, p }: { gear: Gear; p: GearPaint }) {
  switch (gear) {
    case 'princess':
      return (
        <g>
          <path d="M214 112 L234 66 L262 96 L300 36 L338 96 L366 66 L386 112 Q300 96 214 112 Z" fill={p.gold} stroke="#94701F" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="300" cy="72" r="10" fill="#FF5CA8" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="238" cy="88" r="6" fill="#7FD3F7" />
          <circle cx="362" cy="88" r="6" fill="#7FD3F7" />
          <circle cx="296" cy="68" r="3" fill="#FFFFFF" opacity="0.8" />
        </g>
      )
    case 'fairy':
      return (
        <g>
          <path d="M146 196 Q170 110 300 78 Q430 110 454 196" stroke="#3E8F57" strokeWidth="7" fill="none" strokeLinecap="round" />
          {[[150, 190, '#FFB3C7'], [178, 132, '#FFFFFF'], [224, 94, '#C9A7F0'], [280, 78, '#FFB3C7'], [336, 80, '#FFFFFF'], [390, 98, '#C9A7F0'], [432, 134, '#FFB3C7'], [454, 192, '#FFFFFF']].map(([x, y, c]) => (
            <Flower key={x} cx={x as number} cy={y as number} r={20} color={c as string} />
          ))}
        </g>
      )
    case 'idol':
      return (
        <g stroke="#C2266F" strokeWidth="3" strokeLinejoin="round">
          <path d="M390 90 Q330 24 316 78 Q326 124 390 90 Z" fill="#FF5CA8" />
          <path d="M390 90 Q452 30 466 86 Q450 130 390 90 Z" fill="#FF5CA8" />
          <ellipse cx="390" cy="90" rx="15" ry="13" fill="#FF8CC6" />
          <path d="M336 62 Q350 52 362 60" stroke="#FFFFFF" strokeWidth="4" fill="none" opacity="0.6" strokeLinecap="round" />
        </g>
      )
    case 'sakura':
      return (
        <g>
          <path d="M226 26 L376 76" stroke="#8E1B2B" strokeWidth="7" strokeLinecap="round" />
          <path d="M236 72 L370 18" stroke={p.gold} strokeWidth="5" strokeLinecap="round" />
          <path d="M206 108 L200 168 M222 110 L228 156" stroke={p.gold} strokeWidth="2.5" />
          <circle cx="200" cy="172" r="6" fill="#FF8CB0" />
          <circle cx="228" cy="160" r="6" fill="#FF8CB0" />
          <Flower cx={214} cy={96} r={22} color="#FFB3C7" />
        </g>
      )
    default:
      return null
  }
}

/** Heart wand, flower wand, microphone and folding fan, in the raised hand. */
export function GlamHeld({ gear, p }: { gear: Gear; p: GearPaint }) {
  switch (gear) {
    case 'princess':
      return (
        <g>
          <rect x="533" y="150" width="12" height="170" rx="6" fill={p.gold} />
          <path d={heart(539, 116, 30)} fill="#FF5CA8" stroke="#C2266F" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="527" cy="104" r="6" fill="#FFFFFF" opacity="0.7" />
        </g>
      )
    case 'fairy':
      return (
        <g>
          <rect x="534" y="150" width="10" height="170" rx="5" fill="#4E9F5E" />
          <Flower cx={539} cy={116} r={32} color="#FFB3C7" />
          <path d="M582 74 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" fill="#FFFFFF" />
        </g>
      )
    case 'idol':
      return (
        <g>
          <rect x="531" y="196" width="16" height="130" rx="8" fill="#2E333E" />
          <rect x="527" y="190" width="24" height="14" rx="5" fill="#FF5CA8" />
          <circle cx="539" cy="172" r="26" fill={p.steel} stroke="#5A6474" strokeWidth="3" />
          <path d="M519 164 L559 164 M517 176 L561 176 M539 148 L539 196" stroke="#5A6474" strokeWidth="2" opacity="0.7" />
        </g>
      )
    case 'sakura':
      return (
        <g>
          <path d="M539 262 L459 216 A92 92 0 0 1 619 216 Z" fill="#F4A6C0" stroke="#8E1B2B" strokeWidth="3" strokeLinejoin="round" />
          <path d="M539 262 L480 192 M539 262 L508 176 M539 262 L539 170 M539 262 L570 176 M539 262 L598 192" stroke="#C2647F" strokeWidth="2" />
          <Flower cx={556} cy={204} r={14} color="#FFFFFF" center="#F7C6D6" />
        </g>
      )
    default:
      return null
  }
}
