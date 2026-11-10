import { ACH_GLOW, AchBackdrop, AchBody, AchHat, AchHeld, AchOffhand, isAchievementGear } from './achievementArt'
import type { EffectVisual, Gear } from '../../cosmetics/visuals'
import { shade } from '../../lib/color'
import { useSvgIds } from '../../lib/svgIds'
import { edgeX, headTop } from './characterArt'
import { GlamBack, GlamBody, GlamHat, GlamHeld } from './glamArt'

// Themed gear for the 2D paddle character, in the design's coordinates (head x 120..480,
// y 80..490; right hand raised at 539,294; feet around y 716). The 3D gear in
// character3d/gear.ts follows the same shapes.

export interface GearPaint {
  steel: string
  gold: string
  blade: string
  ball: string
  blur: string
  faceClip: string
}

/**
 * Shaded fills, like the gold and steel: each colour becomes a soft radial gradient
 * (light top-left, dark bottom-right), so gear reads as rounded instead of flat.
 */
function useTones() {
  const keys = Object.keys(TONES) as Tone[]
  const ids = useSvgIds(...keys)
  const defs = (
    <defs>
      {keys.map((k) => (
        <radialGradient key={k} id={ids[k]} cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor={shade(TONES[k], 0.38)} />
          <stop offset="0.5" stopColor={TONES[k]} />
          <stop offset="1" stopColor={shade(TONES[k], -0.45)} />
        </radialGradient>
      ))}
    </defs>
  )
  const url = Object.fromEntries(keys.map((k) => [k, `url(#${ids[k]})`])) as Tones
  return { defs, url }
}

/** A soft white shine stroke, as on the knight's helmet. */
function Shine({ d, blur, width = 10 }: { d: string; blur: string; width?: number }) {
  return <path d={d} stroke="#FFFFFF" strokeWidth={width} fill="none" strokeLinecap="round" opacity="0.5" filter={`url(#${blur})`} />
}

const TONES = {
  wizard: '#4C3A9E',
  wizardDark: '#3B2A78',
  pirate: '#2A2E38',
  cowboy: '#8B5A2B',
  cowboyBrim: '#7A4A22',
  ninja: '#2A2E38',
  chef: '#F4F6F9',
  red: '#C0392B',
  sash: '#8E1B2B',
  dark: '#2E333E',
  leather: '#6B4527',
  orb: '#5EEAD4',
  feather: '#F4F6F9',
  devil: '#C0252E',
  devilWing: '#7A1F24',
  star: '#FDE047',
  ranger: '#4C7F45',
  samurai: '#A82634',
  bard: '#2E8C89',
  cleric: '#F4F1EA',
  lute: '#B87333',
  wood: '#8A5E38',
  ruby: '#D93A45',
}
type Tone = keyof typeof TONES
type Tones = Record<Tone, string>

// Angel and devil wings (left side; the right is mirrored), rising from behind the shoulders.
const ANGEL_WING = 'M232 400 Q150 300 40 318 Q80 344 70 372 Q24 384 14 428 Q72 430 84 458 Q58 486 70 512 Q160 500 240 450 Z'
const DEVIL_WING = 'M232 392 Q150 300 44 280 Q72 322 62 352 Q30 354 22 394 Q60 398 72 428 Q50 450 62 474 Q150 456 240 432 Z'

/** Wings, tails and premium backdrops, drawn behind everything else. */
export function GearBack({ gear, premium }: { gear: Gear; premium?: { aura: string; sparkle: string } }) {
  const { defs, url } = useTones()
  if (premium)
    return (
      <g>
        {isAchievementGear(gear) && <AchBackdrop gear={gear} />}
        <PremiumBack gear={gear} aura={premium.aura} sparkle={premium.sparkle} />
      </g>
    )
  if (gear === 'fairy') return <GlamBack gear={gear} />
  if (gear === 'ranger')
    return (
      <g>
        {defs}
      {gear === 'ranger' && (
        <g transform="translate(430 86) rotate(24)">
          <path d="M-6 0 L-6 -46 M6 0 L6 -40 M0 0 L0 -52" stroke="#C9B48A" strokeWidth="3" />
          <path d="M-6 -46 L-13 -60 L-6 -54 L1 -60 Z M6 -40 L-1 -54 L6 -48 L13 -54 Z M0 -52 L-7 -66 L0 -60 L7 -66 Z" fill="#E9EEF5" />
          <rect x="-22" y="-6" width="44" height="160" rx="12" fill={url.leather} stroke="#4A2F1A" strokeWidth="3" />
          <path d="M-22 20 L22 20 M-22 120 L22 120" stroke="#D9AE4A" strokeWidth="4" />
        </g>
      )}
      </g>
    )
  if (gear !== 'angel' && gear !== 'devil') return null
  const angel = gear === 'angel'
  const wing = (
    <g>
      <path d={angel ? ANGEL_WING : DEVIL_WING} fill={angel ? url.feather : url.devilWing} stroke={angel ? '#D9DDE3' : '#4A0F17'} strokeWidth="4" strokeLinejoin="round" />
      {angel ? (
        <path d="M200 408 Q130 360 70 372 M206 428 Q140 420 84 458 M214 444 Q160 470 108 494" stroke="#C9CED6" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M232 400 L62 352 M236 414 L72 428 M238 426 L100 470" stroke="#4A0F17" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
      )}
    </g>
  )
  return (
    <g>
      {defs}
      {wing}
      <g transform="translate(600 0) scale(-1 1)">{wing}</g>
      {!angel && (
        <g>
          <path d="M320 610 Q420 650 436 572 Q446 516 488 520" stroke={url.devil} strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M478 496 L520 520 L478 544 Q490 520 478 496 Z" fill={url.devil} />
        </g>
      )}
    </g>
  )
}

/** Gradients and the soft blur used by the premium skins. */
function usePremiumPaint() {
  const ids = useSvgIds('wing', 'blade', 'obsidian', 'soft', 'membrane')
  const defs = (
    <defs>
      <linearGradient id={ids.wing} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FF8A3C" />
        <stop offset="1" stopColor="#7A1020" />
      </linearGradient>
      <linearGradient id={ids.blade} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#FFF3C4" />
        <stop offset="0.5" stopColor="#FFB347" />
        <stop offset="1" stopColor="#FF5A3C" />
      </linearGradient>
      <radialGradient id={ids.obsidian} cx="35%" cy="25%" r="85%">
        <stop offset="0" stopColor="#6A5A6E" />
        <stop offset="0.6" stopColor="#2A2230" />
        <stop offset="1" stopColor="#0E0A12" />
      </radialGradient>
      <radialGradient id={ids.membrane} cx="70%" cy="12%" r="95%">
        <stop offset="0" stopColor="#FFB347" />
        <stop offset="0.35" stopColor="#E8642C" />
        <stop offset="0.75" stopColor="#A3241C" />
        <stop offset="1" stopColor="#5E1018" />
      </radialGradient>
      <filter id={ids.soft} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="16" />
      </filter>
    </defs>
  )
  return { defs, membrane: `url(#${ids.membrane})`, wing: `url(#${ids.wing})`, blade: `url(#${ids.blade})`, obsidian: `url(#${ids.obsidian})`, soft: `url(#${ids.soft})` }
}

const SPARKLE = 'M0 -16 Q2 -2 16 0 Q2 2 0 16 Q-2 2 -16 0 Q-2 -2 0 -16 Z'
const SPARKLES: [number, number, number, string][] = [
  [96, 130, 1, ''],
  [560, 440, 0.9, 'cd-d1'],
  [52, 600, 0.75, 'cd-d2'],
  [520, 660, 1, 'cd-d3'],
  [40, 330, 0.65, 'cd-d2'],
  [460, 40, 0.65, 'cd-d1'],
]

/**
 * Dragon wing (left; the right mirrors it): an arm bone from the shoulder (200, 330) to a clawed wrist
 * (70, 170), four finger bones fanning out, and a membrane scalloped between the finger tips.
 */
const DRAGON_WING = 'M200 330 Q150 230 70 170 L10 130 Q36 196 -10 250 Q40 290 20 350 Q72 372 90 420 Q140 412 190 430 Z'
const DRAGON_FINGERS = ['M70 170 L10 130', 'M70 170 Q30 210 -10 250', 'M70 170 Q50 270 20 350', 'M70 170 Q86 300 90 420']
const DRAGON_VEINS = 'M58 196 Q30 220 16 240 M60 236 Q44 280 34 310 M76 250 Q76 320 70 380 M100 260 Q120 340 140 410'

/** Premium backdrop (big glow + sparkles) and the dragon's wings and flames / the reaper's wisps. */
function PremiumBack({ gear, aura, sparkle }: { gear: Gear; aura: string; sparkle: string }) {
  const pp = usePremiumPaint()
  const wing = (
    <g className="cd-flap">
      <path d={DRAGON_WING} fill="#FF7A3C" opacity="0.35" filter={pp.soft} />
      <path d={DRAGON_WING} fill={pp.membrane} stroke="#3E0D17" strokeWidth="3" strokeLinejoin="round" opacity="0.95" />
      <path d={DRAGON_VEINS} stroke="#FFB347" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.45" />
      {DRAGON_FINGERS.map((d, i) => (
        <path key={d} d={d} stroke="#4A1410" strokeWidth={6 - i * 0.6} fill="none" strokeLinecap="round" />
      ))}
      <path d="M200 330 Q150 230 70 170" stroke="#4A1410" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M196 322 Q148 228 74 176" stroke="#FF9A5C" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Claws: on the wrist and each finger tip */}
      <path d="M70 170 Q54 140 68 112 Q72 138 86 160 Z" fill="#F2E6C8" stroke="#8A6A4A" strokeWidth="2" strokeLinejoin="round" />
      {[[10, 130, -150], [-10, 250, -175], [20, 350, 160]].map(([x, y, r]) => (
        <path key={x} d="M0 -5 L14 0 L0 5 Z" transform={`translate(${x} ${y}) rotate(${r})`} fill="#F2E6C8" />
      ))}
    </g>
  )
  return (
    <g>
      {pp.defs}
      <circle cx="300" cy="400" r="230" fill={aura} opacity="0.28" filter={pp.soft} className="cd-glow" />
      {SPARKLES.map(([x, y, k, delay]) => (
        <path key={`${x}-${y}`} d={SPARKLE} transform={`translate(${x} ${y}) scale(${k})`} fill={sparkle} className={`cd-twinkle ${delay}`} />
      ))}
      {gear === 'dragon' && (
        <g>
          {wing}
          <g transform="translate(600 0) scale(-1 1)">{wing}</g>
          <path d="M200 720 Q180 680 200 650 Q206 680 220 690 Q226 660 244 640 Q246 690 262 720 Z" fill="#FF7A3C" opacity="0.8" className="cd-flick" />
          <path d="M338 720 Q352 690 356 640 Q374 660 380 690 Q394 680 400 650 Q420 680 400 720 Z" fill="#FF7A3C" opacity="0.8" className="cd-flick" />
        </g>
      )}
      {gear === 'void' && (
        <g>
          {/* Dark smoke curling around the reaper, and mist pooling at its feet */}
          <circle cx="300" cy="400" r="250" fill="#05030A" opacity="0.55" filter={pp.soft} />
          {[[150, 560, 90, 60, ''], [450, 520, 80, 70, 'cd-d1'], [110, 330, 60, 80, 'cd-d2'], [500, 300, 60, 70, 'cd-d3'], [300, 250, 140, 60, 'cd-d2']].map(([x, y, rx, ry, d]) => (
            <ellipse key={`${x}`} cx={x} cy={y} rx={rx} ry={ry} fill="#120A20" opacity="0.85" filter={pp.soft} className={`cd-glow ${d}`} />
          ))}
          <ellipse cx="300" cy="730" rx="220" ry="40" fill="#1A0F2E" opacity="0.9" filter={pp.soft} />
          <ellipse cx="300" cy="736" rx="160" ry="22" fill="#5B24A8" opacity="0.35" filter={pp.soft} className="cd-glow" />
        </g>
      )}
      {gear === 'void' && (
        <g className="cd-orbit">
          <path d="M40 420 Q20 380 50 350 Q46 380 70 392 Q60 410 40 420 Z" fill="#B48CFF" opacity="0.7" />
          <path d="M430 196 Q446 156 486 160 Q462 178 470 204 Q450 208 430 196 Z" fill="#B48CFF" opacity="0.6" />
          <path d="M420 650 Q452 672 446 708 Q430 684 404 686 Q404 664 420 650 Z" fill="#B48CFF" opacity="0.6" />
          <circle cx="52" cy="352" r="5" fill="#E9DDFF" />
          <circle cx="484" cy="162" r="5" fill="#E9DDFF" />
          <circle cx="446" cy="706" r="5" fill="#E9DDFF" />
        </g>
      )}
    </g>
  )
}

/** The dragon's helm and the reaper's hood. */
function PremiumHat({ gear, p }: { gear: Gear; p: GearPaint }) {
  const pp = usePremiumPaint()
  if (gear === 'dragon')
    return (
      <g>
        {pp.defs}
        {[false, true].map((mirror) => (
          <g key={String(mirror)} transform={mirror ? 'translate(600 0) scale(-1 1)' : undefined}>
            <path d="M172 182 Q108 172 82 122 Q58 78 76 14 Q98 74 124 102 Q154 128 196 136 Z" fill={pp.obsidian} stroke="#FF7A3C" strokeWidth="3" strokeLinejoin="round" />
            <path d="M152 166 Q138 156 146 142 M124 146 Q110 132 120 118 M100 120 Q88 104 98 90 M84 90 Q76 74 84 62" stroke="#FF7A3C" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55" />
            <path d="M76 14 Q84 40 94 56 Q80 50 74 34 Z" fill="#FFB347" className="cd-glow" />
            <path d="M118 118 Q98 96 88 66" stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.2" />
          </g>
        ))}
        <path d="M180 120 L196 70 L222 100 L250 52 L272 92 L300 32 L328 92 L350 52 L378 100 L404 70 L420 120 Z" fill={pp.wing} stroke="#3E0D17" strokeWidth="3" strokeLinejoin="round" />
        <path d={cap(214)} fill={pp.obsidian} stroke="#0E0A12" strokeWidth="4" />
        <path d={band(214, 232)} fill="#FF7A3C" />
        <path d={band(214, 232)} fill="#FFB347" opacity="0.6" filter={`url(#${p.blur})`} className="cd-glow" />
        <path d="M262 120 L300 156 L338 120 L300 104 Z" fill="#FF5A3C" stroke="#FFB347" strokeWidth="2" strokeLinejoin="round" />
        <Shine d="M190 116 Q230 88 278 80" blur={p.blur} />
      </g>
    )
  return (
    <g>
      <path d="M290 74 Q326 34 352 18 Q342 48 392 86 Z" fill="#2E1E48" stroke="#6B3FB0" strokeWidth="3" strokeLinejoin="round" />
      <path d={hood(256, "Q462 160 300 150 Q138 160", 16)} fill="#2E1E48" stroke="#6B3FB0" strokeWidth="3" strokeLinejoin="round" />
      <path d="M136 238 Q158 166 300 158 Q442 166 464 238" stroke="#9B5CFF" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.5" filter={`url(#${p.blur})`} />
      <path d="M136 238 Q158 166 300 158 Q442 166 464 238" stroke="#B48CFF" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M144 240 Q164 176 300 168 Q436 176 456 240 Q300 214 144 240 Z" fill="#000000" opacity="0.35" filter={`url(#${p.blur})`} />
      <Shine d="M190 100 Q236 72 290 62" blur={p.blur} width={8} />
      <circle cx="300" cy="104" r="20" fill="#9B5CFF" opacity="0.5" filter={`url(#${p.blur})`} />
      <circle cx="300" cy="104" r="10" fill="#B48CFF" className="cd-glow" />
    </g>
  )
}

/** The dragon's flaming sword and the reaper's scythe. */
function PremiumHeld({ gear, p }: { gear: Gear; p: GearPaint }) {
  const pp = usePremiumPaint()
  if (gear === 'dragon')
    return (
      <g>
        {pp.defs}
        <path d="M539 50 Q512 110 526 160 Q506 206 524 256 L554 256 Q572 206 552 160 Q566 110 539 50 Z" fill="#FF7A3C" opacity="0.7" filter={`url(#${p.blur})`} className="cd-flick" />
        <path d="M530 254 L530 104 L539 72 L548 104 L548 254 Z" fill={pp.blade} stroke="#8A1A28" strokeWidth="2" />
        <path d="M500 248 Q520 262 539 250 Q558 262 578 248 L574 264 Q556 272 539 264 Q522 272 504 264 Z" fill={pp.obsidian} stroke="#FF7A3C" strokeWidth="2" />
        <rect x="533" y="264" width="12" height="56" rx="4" fill="#2A1A1E" />
        <circle cx="539" cy="322" r="9" fill="#FF5A3C" />
      </g>
    )
  return (
    <g>
      <rect x="534" y="78" width="10" height="400" rx="5" fill="#2A1A30" />
      <path d="M534 150 L544 150 M534 230 L544 230" stroke="#8A8FA0" strokeWidth="4" />
      <path d="M546 84 Q498 14 396 32 Q478 46 530 114 Z" fill="#9B5CFF" opacity="0.5" filter={`url(#${p.blur})`} />
      <path d="M546 84 Q498 14 396 32 Q478 46 530 114 Z" fill={p.steel} stroke="#2A1A30" strokeWidth="3" strokeLinejoin="round" />
      <path d="M400 33 Q480 48 528 108" stroke="#D6B8FF" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="539" cy="84" r="9" fill="#B48CFF" stroke="#2A1A30" strokeWidth="2" />
    </g>
  )
}

/** A helmet or cap covering the head above `y`, with a rim that dips `dip` in the middle. */
function cap(y: number, e = 9, dip = 28) {
  return `${headTop(y, e)} Q300 ${y - dip} ${edgeX(y, e)} ${y} Z`
}

/** A band hugging the head between heights `y0` and `y1`. */
function band(y0: number, y1: number, e = 9, dip = 28) {
  const l0 = edgeX(y0, e)
  const l1 = edgeX(y1, e)
  return `M${l0} ${y0} Q300 ${y0 - dip} ${600 - l0} ${y0} L${600 - l1} ${y1} Q300 ${y1 - dip} ${l1} ${y1} Z`
}

/** A hood: the head outline down to `y`, with the face opening `inner` (a path from the right side back to the left). */
function hood(y: number, inner: string, e = 12) {
  return `${headTop(y, e)} ${inner} L${edgeX(y, e)} ${y} Z`
}

const CAPE_PATH = 'M168 380 Q132 560 146 700 Q222 724 300 712 Q378 724 454 700 Q468 560 432 380 Z'
const VOID_CAPE = 'M166 380 Q128 560 136 704 L168 680 L196 718 L226 684 L256 724 L300 692 L344 724 L374 684 L404 718 L432 680 L464 704 Q472 560 434 380 Z'

/** Cape or robe, drawn behind the body. */
export function GearCape({ gear, color, gradient }: { gear: Gear; color: string | null; gradient: string }) {
  if (!color) return null
  return (
    <g>
      <path d={gear === 'void' ? VOID_CAPE : CAPE_PATH} fill={gradient} stroke={gear === 'void' ? '#6B3FB0' : undefined} strokeWidth="2" strokeLinejoin="round" />
      <path d="M220 700 Q226 620 214 540 M300 712 Q304 630 300 540 M380 700 Q374 620 386 540" stroke="#000" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.25" />
      {gear === 'royal' && (
        <g>
          <path d="M146 700 Q222 724 300 712 Q378 724 454 700" stroke="#F8F5EE" strokeWidth="22" fill="none" strokeLinecap="round" />
          <g fill="#1A1D24">
            {[176, 232, 290, 348, 406].map((x) => (
              <path key={x} d={`M${x} 704 l4 10 l4 -10 Z`} />
            ))}
          </g>
        </g>
      )}
      {gear === 'void' && (
        <g>
          <circle cx="196" cy="600" r="14" fill="#9B5CFF" opacity="0.5" />
          <circle cx="404" cy="620" r="14" fill="#9B5CFF" opacity="0.5" />
          <circle cx="196" cy="600" r="7" fill="#B48CFF" className="cd-glow" />
          <circle cx="404" cy="620" r="7" fill="#B48CFF" className="cd-glow" />
        </g>
      )}
      {gear === 'cleric' && <path d="M190 560 L410 560 M180 640 L420 640" stroke="#D9AE4A" strokeWidth="6" opacity="0.8" />}
      {gear === 'wizard' && (
        <g fill="#FDE047" opacity="0.8">
          {[[200, 600], [392, 640], [300, 680]].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="5" />
          ))}
        </g>
      )}
    </g>
  )
}

/** Belts, aprons and scarves worn over the handle. `hx`/`hw` are the handle's left edge and width. */
export function GearBody({ gear, hx, hw, p }: { gear: Gear; hx: number; hw: number; p: GearPaint }) {
  const { defs, url } = useTones()
  if (isAchievementGear(gear)) return <AchBody gear={gear} hx={hx} hw={hw} p={p} />
  return (
    <g>
      {defs}
      <Body gear={gear} hx={hx} hw={hw} p={p} t={url} />
    </g>
  )
}

function Body({ gear, hx, hw, p, t }: { gear: Gear; hx: number; hw: number; p: GearPaint; t: Tones }) {
  const belt = (color: string, buckle: string) => (
    <g>
      <rect x={hx - 6} y="516" width={hw + 12} height="20" rx="6" fill={color} />
      <rect x="288" y="511" width="24" height="30" rx="5" fill="none" stroke={buckle} strokeWidth="5" />
    </g>
  )
  switch (gear) {
    case 'knight':
      return (
        <g>
          {belt(t.leather, p.gold)}
          <rect x={hx + hw - 20} y="532" width="22" height="26" rx="6" fill="#5A381F" />
        </g>
      )
    case 'ranger':
      return (
        <g>
          <rect x={hx - 6} y="516" width={hw + 12} height="18" rx="6" fill="#4A2F1A" />
          <rect x={hx + hw - 20} y="530" width="22" height="26" rx="6" fill={t.leather} />
        </g>
      )
    case 'viking':
      return (
        <g>
          <path d="M214 474 Q300 500 386 474 Q398 500 374 516 Q300 534 226 516 Q202 500 214 474 Z" fill="#D8C59A" />
          <path d="M232 490 Q240 504 252 508 M270 496 Q278 512 290 514 M310 514 Q322 512 330 496 M348 508 Q360 504 368 490" stroke="#A8925E" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'void':
      return (
        <g>
          <path d="M246 474 Q300 520 354 474" stroke="#8A8FA0" strokeWidth="4" fill="none" strokeDasharray="6 4" />
          <circle cx="300" cy="502" r="16" fill="#9B5CFF" opacity="0.6" filter={`url(#${p.blur})`} />
          <path d="M300 488 L312 502 L300 518 L288 502 Z" fill="#B48CFF" stroke="#C9D1DC" strokeWidth="3" strokeLinejoin="round" />
        </g>
      )
    case 'bard':
      return <path d="M262 472 L300 500 L338 472 L330 512 L300 498 L270 512 Z" fill="#E6C46A" />
    case 'pirate':
      return (
        <g>
          <rect x={hx - 6} y="514" width={hw + 12} height="24" rx="8" fill={t.red} />
          <path d={`M${hx + hw - 12} 526 Q${hx + hw - 12} 560 ${hx + hw + 10} 584 M${hx + hw - 12} 526 Q${hx + hw + 8} 556 ${hx + hw - 12} 578`} stroke="#9E2B3A" strokeWidth="9" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'royal':
      return belt('#94701F', '#FBE7A1')
    case 'wizard':
    case 'angel':
      return <path d={`M${hx - 6} 524 Q300 540 ${hx + hw + 6} 524 M300 532 L292 580 M300 532 L310 578`} stroke="#D9AE4A" strokeWidth="7" fill="none" strokeLinecap="round" />
    case 'ninja':
      return (
        <g>
          <path d="M250 492 Q196 524 150 514 Q186 548 258 512 Z" fill="#A02C2E" />
          <path d="M240 466 Q300 490 360 466 L360 498 Q300 520 240 498 Z" fill={t.red} />
        </g>
      )
    case 'chef':
      return (
        <g>
          <path d={`M${hx - 10} 518 Q300 512 ${hx + hw + 10} 518 Q${hx + hw + 18} 580 ${hx + hw + 16} 636 Q300 652 ${hx - 16} 636 Q${hx - 18} 580 ${hx - 10} 518 Z`} fill={t.chef} stroke="#D9DDE3" strokeWidth="3" />
          <rect x="284" y="572" width="32" height="24" rx="5" fill="none" stroke="#C9CED6" strokeWidth="3" />
        </g>
      )
    case 'cowboy':
      return (
        <g>
          <path d="M244 484 Q300 476 356 484 Q340 520 306 546 Q300 551 294 546 Q260 520 244 484 Z" fill={t.red} />
          <g fill="#FFFFFF" opacity="0.8">
            <circle cx="276" cy="496" r="4" />
            <circle cx="320" cy="500" r="4" />
            <circle cx="300" cy="522" r="4" />
          </g>
        </g>
      )
    default:
      return <GlamBody gear={gear} hx={hx} hw={hw} p={p} />
  }
}

/** Hats and helmets, drawn over the face. */
export function GearHat({ gear, p }: { gear: Gear; p: GearPaint }) {
  const { defs, url } = useTones()
  if (isAchievementGear(gear)) return <AchHat gear={gear} p={p} />
  return (
    <g>
      {defs}
      <Hat gear={gear} p={p} t={url} />
    </g>
  )
}

function Hat({ gear, p, t }: { gear: Gear; p: GearPaint; t: Tones }) {
  if (gear === 'dragon' || gear === 'void') return <PremiumHat gear={gear} p={p} />
  switch (gear) {
    case 'knight':
      return (
        <g>
          <path d="M300 66 Q284 22 334 8 Q384 0 412 30 Q368 22 340 40 Q318 54 312 70 Z" fill="#D93A45" />
          <path d={cap(214)} fill={p.steel} stroke="#3C4452" strokeWidth="4" />
          <path d={band(214, 232)} fill={p.gold} />
          <path d="M291 60 L309 60 L307 196 L293 196 Z" fill={p.gold} />
          <path d="M190 112 Q230 84 280 78" stroke="#FFFFFF" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.55" filter={`url(#${p.blur})`} />
          <g fill="#94701F">
            {[[170, 216], [236, 206], [364, 206], [430, 216]].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="5" />
            ))}
          </g>
        </g>
      )
    case 'wizard':
      return (
        <g>
          <ellipse cx="300" cy="140" rx="206" ry="32" fill={t.wizardDark} />
          <path d="M175 138 Q250 40 290 -70 Q304 -112 366 -100 Q330 -70 330 -20 Q350 70 425 138 Z" fill={t.wizard} />
          <Shine d="M222 110 Q262 40 286 -40" blur={p.blur} />
          <path d="M178 124 Q300 102 422 124 L425 140 Q300 118 175 140 Z" fill={p.gold} />
          <path d="M256 50 l6 14 l15 1 l-12 9 l4 15 l-13 -8 l-13 8 l4 -15 l-12 -9 l15 -1 Z" fill="#FDE047" />
          <circle cx="330" cy="10" r="7" fill="#FDE047" />
          <circle cx="300" cy="96" r="5" fill="#FDE047" />
        </g>
      )
    case 'pirate':
      return (
        <g>
          <path d={cap(192, 9, 18)} fill={t.pirate} />
          <Shine d="M186 168 Q196 124 252 112" blur={p.blur} />
          <path d="M100 202 Q120 132 196 170 Q300 116 404 170 Q480 132 500 202 Q300 172 100 202 Z" fill={t.pirate} stroke={p.gold} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="300" cy="146" r="18" fill="#F4F6F9" />
          <g fill="#22232B">
            <circle cx="294" cy="142" r="3" />
            <circle cx="306" cy="144" r="3" />
            <circle cx="300" cy="154" r="3" />
          </g>
        </g>
      )
    case 'cowboy':
      return (
        <g>
          <path d="M200 122 Q196 40 240 20 Q300 42 360 20 Q404 40 400 122 Z" fill={t.cowboy} />
          <Shine d="M222 96 Q220 52 246 34" blur={p.blur} />
          <path d="M199 98 Q300 108 401 98 L401 118 Q300 128 199 118 Z" fill={t.leather} />
          <path d="M84 128 Q118 92 200 112 Q300 128 400 112 Q482 92 516 128 Q470 152 300 150 Q130 152 84 128 Z" fill={t.cowboyBrim} />
          <path d="M240 20 Q300 52 360 20" stroke="#5E3A1B" strokeWidth="4" fill="none" />
        </g>
      )
    case 'ninja':
      return (
        <g>
          <path d="M474 194 Q532 176 574 204 Q530 206 478 212 Z" fill="#2A3046" />
          <path d="M474 206 Q522 220 556 252 Q512 238 476 220 Z" fill="#1F2436" />
          <g clipPath={`url(#${p.faceClip})`}>
            <path d="M100 186 Q300 152 500 186 L500 220 Q300 186 100 220 Z" fill="#2A3046" />
            <path d="M120 190 Q300 160 480 190" stroke="#FFFFFF" strokeWidth="4" fill="none" opacity="0.15" />
          </g>
          <rect x="262" y="166" width="76" height="34" rx="6" fill={p.steel} stroke="#3C4452" strokeWidth="3" />
          <circle cx="300" cy="183" r="9" fill="none" stroke="#3C4452" strokeWidth="3" />
        </g>
      )
    case 'chef':
      return (
        <g>
          <circle cx="222" cy="30" r="54" fill={t.chef} />
          <circle cx="378" cy="30" r="54" fill={t.chef} />
          <circle cx="300" cy="2" r="64" fill={t.chef} />
          <rect x="196" y="44" width="208" height="56" rx="14" fill={t.chef} />
          <path d={cap(118, 8, 14)} fill={t.chef} />
          <Shine d="M262 -30 Q280 -50 310 -54" blur={p.blur} />
          <path d="M240 62 L240 100 M300 62 L300 100 M360 62 L360 100" stroke="#E6E9EE" strokeWidth="4" />
        </g>
      )
    case 'angel':
      return (
        <g className="cd-bob">
          <ellipse cx="300" cy="40" rx="112" ry="26" fill="none" stroke="#FDE68A" strokeWidth="22" opacity="0.5" filter={`url(#${p.blur})`} />
          <ellipse cx="300" cy="40" rx="112" ry="26" fill="none" stroke={p.gold} strokeWidth="14" />
          <path d="M214 30 Q300 10 386 30" stroke="#FFFFFF" strokeWidth="4" fill="none" opacity="0.6" strokeLinecap="round" />
        </g>
      )
    case 'devil':
      return (
        <g>
          <path d="M196 152 Q148 84 168 14 Q196 92 248 120 Z" fill={t.devil} stroke="#7A1F24" strokeWidth="3" strokeLinejoin="round" />
          <path d="M404 152 Q452 84 432 14 Q404 92 352 120 Z" fill={t.devil} stroke="#7A1F24" strokeWidth="3" strokeLinejoin="round" />
          <Shine d="M178 96 Q176 64 178 40" blur={p.blur} width={6} />
        </g>
      )
    case 'ranger':
      return (
        <g>
          <path d="M210 164 Q168 92 196 40 Q214 100 228 160 Z" fill="#D93A45" />
          <path d="M430 176 Q490 196 528 184 Q484 214 440 204 Z" fill={t.ranger} stroke="#1F3A1B" strokeWidth="3" strokeLinejoin="round" />
          <path d={cap(200, 9, 24)} fill={t.ranger} stroke="#1F3A1B" strokeWidth="3" strokeLinejoin="round" />
          <Shine d="M196 170 Q214 132 270 120" blur={p.blur} />
          <path d={band(184, 196, 10, 24)} fill="#6B4527" />
        </g>
      )
    case 'viking':
      return (
        <g>
          <path d="M164 172 Q100 152 92 76 Q128 128 180 140 Z" fill="#F2E6C8" stroke="#B8A77A" strokeWidth="3" strokeLinejoin="round" />
          <path d="M436 172 Q500 152 508 76 Q472 128 420 140 Z" fill="#F2E6C8" stroke="#B8A77A" strokeWidth="3" strokeLinejoin="round" />
          <path d={cap(212)} fill={p.steel} stroke="#3C4452" strokeWidth="4" />
          <path d={band(212, 228)} fill={t.wood} />
          <path d="M292 92 L308 92 L306 196 L294 196 Z" fill={t.wood} />
          <Shine d="M196 120 Q236 96 280 92" blur={p.blur} />
        </g>
      )
    case 'cleric':
      return (
        <g>
          <ellipse cx="300" cy="42" rx="74" ry="14" fill="none" stroke="#FFF3C4" strokeWidth="14" opacity="0.4" filter={`url(#${p.blur})`} />
          <ellipse cx="300" cy="42" rx="74" ry="14" fill="none" stroke="#FBE7A1" strokeWidth="6" className="cd-glow" />
          <path d={hood(240, "Q458 162 300 152 Q142 162")} fill={t.cleric} stroke="#B7AC93" strokeWidth="3" strokeLinejoin="round" />
          <path d="M140 222 Q160 164 300 156 Q440 164 460 222" stroke={p.gold} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M290 84 L310 84 L310 100 L326 100 L326 116 L310 116 L310 136 L290 136 L290 116 L274 116 L274 100 L290 100 Z" fill={p.gold} />
        </g>
      )
    case 'bard':
      return (
        <g>
          <path d="M418 128 Q496 40 566 30 Q508 82 440 140 Z" fill="#E6C46A" stroke="#94701F" strokeWidth="2" strokeLinejoin="round" />
          <path d="M430 132 Q490 74 548 42" stroke="#94701F" strokeWidth="2" fill="none" />
          <path d={cap(180, 9, 20)} fill={t.bard} stroke="#174A48" strokeWidth="3" strokeLinejoin="round" />
          <path d="M170 150 Q170 84 300 80 Q446 78 486 142 Q470 176 300 168 Q186 170 170 150 Z" fill={t.bard} stroke="#174A48" strokeWidth="3" strokeLinejoin="round" />
          <Shine d="M190 160 Q206 122 262 112" blur={p.blur} />
          <path d="M160 178 Q300 202 474 154" stroke="#174A48" strokeWidth="8" fill="none" strokeLinecap="round" />
          <circle cx="300" cy="100" r="8" fill="#174A48" />
        </g>
      )
    case 'samurai':
      return (
        <g>
          <path d="M122 212 Q96 254 116 292 L156 226 Z" fill="#5E1522" />
          <path d="M478 212 Q504 254 484 292 L444 226 Z" fill="#5E1522" />
          <path d="M300 124 Q250 74 228 30 Q272 64 300 98 Q328 64 372 30 Q350 74 300 124 Z" fill={p.gold} stroke="#94701F" strokeWidth="2" strokeLinejoin="round" />
          <path d={cap(212)} fill={t.samurai} stroke="#3E0D17" strokeWidth="4" />
          <path d={band(212, 228)} fill="#2A1A1E" />
          <circle cx="300" cy="150" r="14" fill={p.gold} />
          <Shine d="M200 120 Q240 98 280 94" blur={p.blur} />
        </g>
      )
    case 'royal':
      return (
        <g>
          <path d="M172 124 L180 30 L232 82 L266 8 L300 70 L334 8 L368 82 L420 30 L428 124 Z" fill={p.gold} stroke="#94701F" strokeWidth="4" strokeLinejoin="round" />
          <path d={band(104, 130, 9, 10)} fill="#B8862E" />
          {[[180, 30], [266, 8], [334, 8], [420, 30]].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="9" fill="#FBE7A1" />
          ))}
          <circle cx="300" cy="117" r="9" fill="#D93A45" />
          <circle cx="236" cy="117" r="7" fill="#3D7FE0" />
          <circle cx="364" cy="117" r="7" fill="#2F9E5B" />
        </g>
      )
    default:
      return <GlamHat gear={gear} p={p} />
  }
}

/** Where each held item's effect sits: centre x, y and radii. */
const GLOW: Record<Gear, [number, number, number, number]> = {
  none: [539, 294, 44, 44],
  chef: [539, 140, 50, 90],
  cowboy: [539, 190, 76, 56],
  ninja: [548, 248, 34, 34],
  knight: [539, 165, 26, 95],
  pirate: [536, 190, 30, 90],
  wizard: [539, 104, 50, 50],
  royal: [539, 116, 40, 40],
  angel: [539, 128, 44, 44],
  ranger: [560, 294, 40, 120],
  viking: [570, 196, 46, 56],
  cleric: [539, 118, 36, 36],
  bard: [539, 294, 44, 44],
  samurai: [540, 170, 24, 100],
  dragon: [539, 160, 30, 100],
  void: [490, 64, 60, 40],
  devil: [539, 110, 40, 60],
  princess: [539, 116, 40, 40],
  fairy: [539, 116, 44, 44],
  idol: [539, 172, 34, 34],
  sakura: [539, 210, 70, 44],
  ...ACH_GLOW,
}

/** The item held in the raised right hand, plus its effect. Drawn inside the arm's group so it swings. */
export function GearHeld({ gear, p, effect }: { gear: Gear; p: GearPaint; effect?: EffectVisual | null }) {
  const [gx, gy, rx, ry] = GLOW[gear]
  return (
    <g>
      {effect && <EffectBack effect={effect} cx={gx} cy={gy} rx={rx} ry={ry} blur={p.blur} />}
      <HeldItem gear={gear} p={p} />
      {effect && <EffectFront effect={effect} cx={gx} cy={gy} r={Math.max(rx, ry)} />}
    </g>
  )
}

/** The effect's glow behind the item: a coloured halo with a white-hot core. */
function EffectBack({ effect, cx, cy, rx, ry, blur }: { effect: EffectVisual; cx: number; cy: number; rx: number; ry: number; blur: string }) {
  return (
    <g className="cd-glow">
      <ellipse cx={cx} cy={cy} rx={rx * 1.5 + 20} ry={ry * 1.3 + 20} fill={effect.color} opacity="0.45" filter={`url(#${blur})`} />
      <ellipse cx={cx} cy={cy} rx={rx + 8} ry={ry + 8} fill={effect.color} opacity="0.7" filter={`url(#${blur})`} />
      <ellipse cx={cx} cy={cy} rx={rx * 0.45} ry={ry * 0.45} fill="#FFFFFF" opacity="0.45" filter={`url(#${blur})`} />
    </g>
  )
}

/** The part of each effect drawn over the item: rings, sparks or flames. */
function EffectFront({ effect, cx, cy, r }: { effect: EffectVisual; cx: number; cy: number; r: number }) {
  const c = effect.color
  switch (effect.kind) {
    case 'pulse':
      return <circle cx={cx} cy={cy} r={r * 0.9} fill="none" stroke={c} strokeWidth="5" opacity="0.85" className="cd-glow" />
    case 'wave':
      return (
        <g fill="none" stroke={c} strokeWidth="4" className="cd-glow">
          <circle cx={cx} cy={cy} r={r * 0.85} opacity="0.9" />
          <circle cx={cx} cy={cy} r={r * 1.25} opacity="0.5" />
        </g>
      )
    case 'spark':
      return (
        <g stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" className="cd-glow">
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={a} d={`M${cx} ${cy - r * 0.8} l8 14 l-10 4 l8 14`} transform={`rotate(${a} ${cx} ${cy})`} stroke={a % 144 ? c : '#FFFFFF'} />
          ))}
        </g>
      )
    case 'flame':
      return (
        <g className="cd-glow">
          {[-1, 0, 1].map((i) => (
            <path
              key={i}
              d={`M${cx + i * 22} ${cy - r * 0.55} c-16 -8 -12 -30 0 -52 c4 16 14 22 10 38 c6 -6 6 -14 4 -20 c10 14 6 32 -14 34 Z`}
              fill={i === 0 ? '#FDE68A' : c}
              opacity="0.9"
            />
          ))}
        </g>
      )
  }
}

function HeldItem({ gear, p }: { gear: Gear; p: GearPaint }) {
  const { defs, url } = useTones()
  if (isAchievementGear(gear)) return <AchHeld gear={gear} p={p} />
  return (
    <g>
      {defs}
      <Held gear={gear} p={p} t={url} />
    </g>
  )
}

function Held({ gear, p, t }: { gear: Gear; p: GearPaint; t: Tones }) {
  if (gear === 'dragon' || gear === 'void') return <PremiumHeld gear={gear} p={p} />
  switch (gear) {
    case 'knight':
      return (
        <g>
          <path d="M530 254 L530 104 L539 76 L548 104 L548 254 Z" fill={p.blade} stroke="#5A6474" strokeWidth="2" />
          <path d="M539 110 L539 244" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />
          <rect x="508" y="250" width="62" height="14" rx="7" fill={p.gold} />
          <rect x="533" y="262" width="12" height="56" rx="4" fill="#3B2A1E" />
          <circle cx="539" cy="322" r="9" fill={p.gold} />
        </g>
      )
    case 'wizard':
      return (
        <g>
          <rect x="531" y="118" width="16" height="430" rx="8" fill={t.wood} />
          <path d="M520 132 Q539 96 558 132" stroke="#8B5A2B" strokeWidth="8" fill="none" strokeLinecap="round" />
          <circle cx="539" cy="104" r="28" fill={t.orb} stroke="#14A3A3" strokeWidth="4" />
          <circle cx="530" cy="94" r="8" fill="#FFFFFF" opacity="0.8" />
        </g>
      )
    case 'pirate':
      return (
        <g>
          <path d="M532 278 Q510 180 556 94 Q552 182 550 278 Z" fill={p.blade} stroke="#5A6474" strokeWidth="2" strokeLinejoin="round" />
          <path d="M516 304 Q512 262 562 266" stroke={p.gold} strokeWidth="7" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'ninja':
      return (
        <g>
          <g transform="translate(548 248) rotate(15)">
            <path d="M0 -28 L7 -7 L28 0 L7 7 L0 28 L-7 7 L-28 0 L-7 -7 Z" fill={p.steel} stroke="#3C4452" strokeWidth="2" strokeLinejoin="round" />
            <circle r="5" fill="#3C4452" />
          </g>
        </g>
      )
    case 'cowboy':
      return (
        <g fill="none" stroke="#C8A165" strokeLinecap="round">
          <ellipse cx="539" cy="186" rx="60" ry="40" strokeWidth="7" />
          <path d="M539 294 Q550 250 539 226" strokeWidth="7" />
          <path d="M539 294 Q520 330 528 360" strokeWidth="6" />
        </g>
      )
    case 'chef':
      return (
        <g>
          <rect x="533" y="170" width="12" height="150" rx="6" fill={t.dark} />
          <rect x="506" y="72" width="66" height="104" rx="14" fill={p.steel} stroke="#7D8798" strokeWidth="3" />
          <path d="M526 92 L526 156 M539 92 L539 156 M552 92 L552 156" stroke="#7D8798" strokeWidth="4" strokeLinecap="round" />
        </g>
      )
    case 'ranger':
      return (
        <g>
          <path d="M524 146 L524 442" stroke="#EDE6D6" strokeWidth="2" />
          <path d="M524 146 Q618 294 524 442" stroke={t.leather} strokeWidth="10" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'viking':
      return (
        <g>
          <rect x="533" y="140" width="12" height="330" rx="6" fill={t.leather} />
          <path d="M545 150 Q604 136 610 196 Q604 256 545 242 Z" fill={p.steel} stroke="#3C4452" strokeWidth="3" strokeLinejoin="round" />
          <path d="M533 160 Q508 170 506 196 Q508 222 533 232 Z" fill={p.steel} stroke="#3C4452" strokeWidth="3" strokeLinejoin="round" />
          <path d="M533 180 L545 180 M533 210 L545 210" stroke="#D9AE4A" strokeWidth="4" />
        </g>
      )
    case 'cleric':
      return (
        <g>
          <rect x="534" y="140" width="10" height="330" rx="5" fill={p.gold} />
          <circle cx="539" cy="118" r="40" fill="#FFF3C4" opacity="0.5" filter={`url(#${p.blur})`} />
          <circle cx="539" cy="118" r="24" fill="none" stroke={p.gold} strokeWidth="7" />
          <path d="M539 132 C520 120 523 102 539 111 C555 102 558 120 539 132 Z" fill="#FF7F96" className="cd-glow" />
        </g>
      )
    case 'samurai':
      return (
        <g>
          <path d="M535 266 L535 74 Q540 58 546 70 L546 266 Z" fill={p.blade} stroke="#5A6474" strokeWidth="2" strokeLinejoin="round" />
          <path d="M538 90 L538 250" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />
          <ellipse cx="540" cy="270" rx="18" ry="6" fill={p.gold} />
          <rect x="534" y="274" width="12" height="50" rx="4" fill="#1A1A1F" />
        </g>
      )
    case 'angel':
      return (
        <g>
          <rect x="533" y="150" width="12" height="170" rx="6" fill={p.gold} />
          <path d="M539 92 L549 118 L577 120 L555 137 L563 164 L539 149 L515 164 L523 137 L501 120 L529 118 Z" fill={t.star} stroke="#C9A227" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="533" cy="122" r="6" fill="#FFFFFF" opacity="0.7" />
        </g>
      )
    case 'devil':
      return (
        <g>
          <rect x="533" y="140" width="12" height="300" rx="6" fill={t.dark} />
          <path d="M507 156 L507 104 L517 82 L521 120 L531 120 L531 74 L539 52 L547 74 L547 120 L557 120 L561 82 L571 104 L571 156 Q539 176 507 156 Z" fill={t.devil} stroke="#7A1F24" strokeWidth="3" strokeLinejoin="round" />
        </g>
      )
    case 'royal':
      return (
        <g>
          <rect x="532" y="128" width="14" height="210" rx="7" fill={p.gold} />
          <circle cx="539" cy="116" r="24" fill={t.ruby} stroke="#94701F" strokeWidth="5" />
          <path d="M539 78 L539 96 M530 86 L548 86" stroke="#D9AE4A" strokeWidth="5" strokeLinecap="round" />
          <circle cx="531" cy="108" r="6" fill="#FFFFFF" opacity="0.7" />
        </g>
      )
    default:
      return <GlamHeld gear={gear} p={p} />
  }
}

/** What the left hand holds in front of the body: the knight's or the viking's shield. */
export function GearOffhand({ gear, p, shield, effect }: { gear: Gear; p: GearPaint; shield: string; effect?: EffectVisual | null }) {
  const { defs, url } = useTones()
  if (isAchievementGear(gear)) return <AchOffhand gear={gear} p={p} />
  if (gear === 'knight') return <KnightShield p={p} shield={shield} effect={effect} />
  if (gear !== 'viking') return null
  return (
    <g>
      {defs}
      {effect && <EffectBack effect={effect} cx={96} cy={452} rx={70} ry={70} blur={p.blur} />}
      <circle cx="96" cy="452" r="66" fill={url.wood} stroke="#5A381F" strokeWidth="8" />
      <path d="M52 420 L140 420 M38 452 L154 452 M52 484 L140 484" stroke="#5A381F" strokeWidth="3" opacity="0.6" />
      <circle cx="96" cy="452" r="58" fill="none" stroke={p.steel} strokeWidth="5" />
      <circle cx="96" cy="452" r="17" fill={p.steel} stroke="#3C4452" strokeWidth="2" />
    </g>
  )
}

/** The bard's lute, held at the left hand (drawn under the glove). */
export function Lute() {
  const { defs, url } = useTones()
  return (
    <g>
      {defs}
      <g transform="rotate(-28 90 470)">
        <rect x="82" y="316" width="16" height="110" rx="4" fill="#5A381F" />
        <rect x="78" y="300" width="24" height="24" rx="5" fill="#5A381F" />
        <ellipse cx="90" cy="478" rx="46" ry="56" fill={url.lute} stroke="#5A381F" strokeWidth="3" />
        <circle cx="90" cy="462" r="13" fill="#3B2416" />
        <path d="M86 316 L86 508 M90 316 L90 508 M94 316 L94 508" stroke="#F2E6C8" strokeWidth="1.2" />
        <rect x="74" y="504" width="32" height="8" rx="3" fill="#3B2416" />
      </g>
    </g>
  )
}

/** The knight's shield, in the left hand. */
function KnightShield({ p, shield, effect }: { p: GearPaint; shield: string; effect?: EffectVisual | null }) {
  return (
    <g>
      {effect && <EffectBack effect={effect} cx={96} cy={452} rx={70} ry={70} blur={p.blur} />}
      <circle cx="96" cy="452" r="66" fill={shield} stroke={p.gold} strokeWidth="9" />
      <circle cx="96" cy="452" r="50" fill="none" stroke="#E6C46A" strokeWidth="2" opacity="0.6" />
      <circle cx="96" cy="452" r="26" fill={p.ball} />
      <g fill="#8AA012">
        {[[86, 446, 3.5], [102, 444, 3.5], [96, 460, 3.5], [110, 458, 3], [82, 462, 3]].map(([x, y, r]) => (
          <circle key={x} cx={x} cy={y} r={r} />
        ))}
      </g>
    </g>
  )
}

/** Gear shown on its own (shop and item icons): the hat with the held item beside it. */
export function GearIcon({ gear, p }: { gear: Gear; p: GearPaint }) {
  if (gear === 'none')
    return (
      <g>
        <ellipse cx="250" cy="250" rx="70" ry="42" fill="#F4F6F9" />
        <ellipse cx="370" cy="270" rx="70" ry="42" fill="#F4F6F9" />
        <ellipse cx="230" cy="236" rx="26" ry="10" fill="#FFFFFF" />
        <path d="M184 266 Q250 300 316 266 M304 286 Q370 320 436 286" stroke="#B7F33B" strokeWidth="8" fill="none" strokeLinecap="round" />
      </g>
    )
  return (
    <g>
      <g transform="translate(-10 60)">
        <GearHat gear={gear} p={p} />
      </g>
      <g transform="translate(-40 40)">
        <HeldItem gear={gear} p={p} />
      </g>
    </g>
  )
}
