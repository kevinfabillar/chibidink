import type { ReactNode } from 'react'
import { useSvgIds } from '../../lib/svgIds'
import { LockerRoom } from './Stage'

// Equippable backgrounds: the scene behind the character on the My Character screen, item previews
// and shop cards. Each scene is drawn on a 320 × 380 stage (sliced to fill any box); the character
// stands around the bottom middle. Textures (clouds, water, rock, grain) come from SVG noise filters
// on a still layer; anything that moves sits on a separate layer so the textures aren't redrawn.

export const STARTER_BACKGROUND = 'bg-locker'

type SceneProps = { className?: string; wide?: boolean }

const SCENES: Record<string, (p: SceneProps) => ReactNode> = {
  'bg-locker': ({ className }) => <LockerRoom className={className} />,
  'bg-sunset-court': SunsetCourt,
  'bg-beach': TropicalBeach,
  'bg-neon-arena': NeonArena,
  'bg-galaxy': Galaxy,
  'bg-dragon-lair': DragonLair,
  'bg-void-realm': VoidRealm,
}

/** The scene for a background item id (unknown or none = the starter locker room). */
/**
 * The scene for a background item id (unknown or none = the starter locker room).
 * `wide`: for landscape stages. The whole scene (sky to ground) shows in the middle, so the character
 * stands on its ground, and mirrored copies fill the sides instead of cropping the top and bottom.
 */
export function Scene({ id, className, wide }: { id?: string | null; className?: string; wide?: boolean }) {
  const Draw = SCENES[id ?? ''] ?? SCENES[STARTER_BACKGROUND]
  return <Draw className={className} wide={wide} />
}

/** A still, textured layer plus an optional animated layer on top. */
function Stage({ className, still, live, wide }: SceneProps & { still: ReactNode; live?: ReactNode }) {
  const style = { position: className?.includes('absolute') ? undefined : 'relative', overflow: 'hidden' } as const
  const layer = (content: ReactNode, fit: string, cls = 'absolute inset-0 size-full') => (
    <svg viewBox="0 0 320 380" preserveAspectRatio={fit} className={cls} aria-hidden>
      {content}
    </svg>
  )
  if (wide) {
    // The whole scene in the middle, with mirrored copies continuing it to each side (seamless at the joins).
    const mirrored = (content: ReactNode) => (
      <>
        <g transform="scale(-1 1)">{content}</g>
        <g>{content}</g>
        <g transform="translate(640 0) scale(-1 1)">{content}</g>
      </>
    )
    const wideLayer = (content: ReactNode) => (
      <svg viewBox="-320 0 960 380" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full" aria-hidden>
        {mirrored(content)}
      </svg>
    )
    return (
      <div className={className} style={style}>
        {wideLayer(still)}
        {live && wideLayer(live)}
      </div>
    )
  }
  return (
    <div className={className} style={style}>
      {layer(still, 'xMidYMid slice')}
      {live && layer(live, 'xMidYMid slice')}
    </div>
  )
}

/** A small deterministic scatter of points (so stars don't jump between renders). */
function scatter(n: number, seed: number, box: [number, number, number, number]) {
  const out: [number, number, number][] = []
  let s = seed
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
  for (let i = 0; i < n; i++) out.push([box[0] + rnd() * box[2], box[1] + rnd() * box[3], 0.3 + rnd() * 1.2])
  return out
}

// ---- Shared texture filters ------------------------------------------------------------------------

/** Fine film grain over the whole scene (makes flat gradients read as photographic). */
function Grain({ id, strength = 0.09 }: { id: string; strength?: number }) {
  return (
    <>
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="table" tableValues={`0 ${strength}`} />
        </feComponentTransfer>
      </filter>
    </>
  )
}

/** Soft noise clouds tinted `rgb` (0..1 each). Larger `density` = more cloud cover. */
function CloudFilter({ id, rgb, freq, seed, density = 2.2, cut = 1.0 }: { id: string; rgb: [number, number, number]; freq: string; seed: number; density?: number; cut?: number }) {
  return (
    <filter id={id} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="5" seed={seed} />
      <feColorMatrix type="matrix" values={`0 0 0 0 ${rgb[0]}  0 0 0 0 ${rgb[1]}  0 0 0 0 ${rgb[2]}  0 0 0 ${density} -${cut}`} />
    </filter>
  )
}

/** Lit, bumpy rock: noise turned into a relief and lit from the upper left, multiplied onto the shape. */
function RockFilter({ id, light, scale = 4 }: { id: string; light: string; scale?: number }) {
  return (
    <filter id={id} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="5" seed="7" result="n" />
      <feDiffuseLighting in="n" lightingColor={light} surfaceScale={scale} result="lit">
        <feDistantLight azimuth="235" elevation="38" />
      </feDiffuseLighting>
      <feComposite in="lit" in2="SourceGraphic" operator="in" result="clip" />
      <feBlend in="clip" in2="SourceGraphic" mode="multiply" />
    </filter>
  )
}

function Fade({ id, from = 1, to = 0, y1 = 0, y2 = 1 }: { id: string; from?: number; to?: number; y1?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1="0" y1={y1} x2="0" y2={y2}>
      <stop offset="0" stopColor="#FFFFFF" stopOpacity={from} />
      <stop offset="1" stopColor="#FFFFFF" stopOpacity={to} />
    </linearGradient>
  )
}

// ---- Scenes ----------------------------------------------------------------------------------------

function SunsetCourt({ className, wide }: SceneProps) {
  const ids = useSvgIds('sky', 'bloom', 'clouds', 'cloudMask', 'cloudFade', 'court', 'surround', 'net', 'fence', 'grain', 'glare', 'blur')
  const still = (
    <>
      <defs>
        <linearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1C1A4A" />
          <stop offset="0.35" stopColor="#5B2A6E" />
          <stop offset="0.55" stopColor="#C84F6E" />
          <stop offset="0.66" stopColor="#F08A55" />
          <stop offset="0.72" stopColor="#FFC27A" />
        </linearGradient>
        <radialGradient id={ids.bloom} cx="72%" cy="56%" r="55%">
          <stop offset="0" stopColor="#FFF2C9" stopOpacity="0.95" />
          <stop offset="0.12" stopColor="#FFD08A" stopOpacity="0.7" />
          <stop offset="0.45" stopColor="#FF8A55" stopOpacity="0.18" />
          <stop offset="1" stopColor="#FF8A55" stopOpacity="0" />
        </radialGradient>
        <CloudFilter id={ids.clouds} rgb={[1, 0.72, 0.68]} freq="0.006 0.028" seed={4} density={2.4} cut={1.05} />
        <Fade id={ids.cloudFade} from={0.9} to={0} y1={0.1} y2={0.62} />
        <mask id={ids.cloudMask}>
          <rect width="320" height="250" fill={`url(#${ids.cloudFade})`} />
        </mask>
        <linearGradient id={ids.court} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B6FA0" />
          <stop offset="1" stopColor="#1C3F66" />
        </linearGradient>
        <linearGradient id={ids.surround} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3E7A5C" />
          <stop offset="1" stopColor="#1E4636" />
        </linearGradient>
        <linearGradient id={ids.glare} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFD08A" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFD08A" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FFD08A" stopOpacity="0" />
        </linearGradient>
        <pattern id={ids.net} width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M0 0 L5 5 M5 0 L0 5" stroke="#0B1320" strokeWidth="0.6" />
        </pattern>
        <pattern id={ids.fence} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0 L0 9 M0 0 L9 0" stroke="#1A1430" strokeWidth="0.8" opacity="0.7" />
        </pattern>
        <filter id={ids.blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <Grain id={ids.grain} />
      </defs>
      <rect width="320" height="380" fill={`url(#${ids.sky})`} />
      <rect width="320" height="250" filter={`url(#${ids.clouds})`} mask={`url(#${ids.cloudMask})`} opacity="0.8" />
      <rect width="320" height="380" fill={`url(#${ids.bloom})`} />
      <circle cx="230" cy="214" r="22" fill="#FFF4D2" />
      {/* Distant tree line and city, hazy */}
      <path d="M0 228 Q12 216 24 224 Q36 210 50 222 Q66 212 80 224 L96 226 L96 212 L104 212 L104 226 L130 226 Q146 214 160 224 Q176 210 194 222 L210 226 L210 206 L220 206 L220 226 L250 224 Q268 212 286 222 Q302 214 320 222 L320 252 L0 252 Z" fill="#5A2A55" opacity="0.75" />
      <path d="M0 238 Q30 228 60 236 Q90 226 120 236 Q150 228 180 236 Q210 226 240 236 Q280 228 320 236 L320 254 L0 254 Z" fill="#3A1B3E" />
      {/* Fence */}
      <rect x="0" y="196" width="320" height="58" fill={`url(#${ids.fence})`} />
      <path d="M0 196 L320 196" stroke="#1A1430" strokeWidth="2" />
      {[10, 70, 130, 190, 250, 310].map((x) => (
        <rect key={x} x={x - 1.5} y="190" width="3" height="64" fill="#1A1430" />
      ))}
      {/* Light poles */}
      {[22, 298].map((x) => (
        <g key={x}>
          <rect x={x - 2} y="120" width="4" height="134" fill="#141024" />
          <rect x={x - 12} y="114" width="24" height="7" rx="2" fill="#141024" />
          <ellipse cx={x} cy="124" rx="20" ry="8" fill="#FFE9B0" opacity="0.55" filter={`url(#${ids.blur})`} />
        </g>
      ))}
      {/* Court in perspective */}
      <path d="M0 254 L320 254 L320 380 L0 380 Z" fill={`url(#${ids.surround})`} />
      <path d="M58 258 L262 258 L346 380 L-26 380 Z" fill={`url(#${ids.court})`} />
      <path d="M150 258 L270 258 L330 380 L120 380 Z" fill={`url(#${ids.glare})`} />
      <g stroke="#F2F6FA" strokeWidth="2.4" fill="none" opacity="0.92">
        <path d="M58 258 L262 258 L346 380 M-26 380 L58 258" />
        <path d="M160 258 L160 300 M160 330 L160 380" />
        <path d="M34 294 L286 294 M8 334 L312 334" opacity="0.85" />
      </g>
      {/* Net */}
      <path d="M38 304 L282 304 L282 322 L38 322 Z" fill={`url(#${ids.net})`} />
      <path d="M38 304 L282 304" stroke="#F2F6FA" strokeWidth="3" />
      <path d="M38 300 L38 326 M282 300 L282 326" stroke="#0E1622" strokeWidth="4" strokeLinecap="round" />
      <path d="M38 326 L282 326" stroke="#000" strokeWidth="5" opacity="0.18" filter={`url(#${ids.blur})`} />
      <rect width="320" height="380" filter={`url(#${ids.grain})`} />
    </>
  )
  return <Stage className={className} wide={wide} still={still} />
}

function TropicalBeach({ className, wide }: SceneProps) {
  const ids = useSvgIds('sky', 'clouds', 'cloudMask', 'cloudFade', 'sea', 'glint', 'glintMask', 'glintFade', 'sand', 'grainSand', 'trunk', 'leaf', 'grain', 'blur', 'haze')
  const still = (
    <>
      <defs>
        <linearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F86D6" />
          <stop offset="0.55" stopColor="#8FD0F5" />
          <stop offset="0.62" stopColor="#D8F1FF" />
        </linearGradient>
        <CloudFilter id={ids.clouds} rgb={[1, 1, 1]} freq="0.008 0.03" seed={9} density={2.6} cut={1.15} />
        <Fade id={ids.cloudFade} from={0.95} to={0} y1={0} y2={0.55} />
        <mask id={ids.cloudMask}>
          <rect width="320" height="220" fill={`url(#${ids.cloudFade})`} />
        </mask>
        <linearGradient id={ids.sea} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14639A" />
          <stop offset="0.5" stopColor="#1E9BB8" />
          <stop offset="1" stopColor="#49D1C9" />
        </linearGradient>
        <filter id={ids.glint} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.3" numOctaves="2" seed="5" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 0.95  0 0 0 7 -3.6" />
        </filter>
        <radialGradient id={ids.glintFade} cx="72%" cy="10%" r="70%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <mask id={ids.glintMask}>
          <rect y="206" width="320" height="64" fill={`url(#${ids.glintFade})`} />
        </mask>
        <linearGradient id={ids.sand} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9A66B" />
          <stop offset="0.12" stopColor="#EED6A0" />
          <stop offset="1" stopColor="#E0BE80" />
        </linearGradient>
        <filter id={ids.grainSand} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="2" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.4  0 0 0 0 0.2  0 0 0 0.5 -0.15" />
        </filter>
        <linearGradient id={ids.trunk} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5A3A22" />
          <stop offset="0.5" stopColor="#9A6B42" />
          <stop offset="1" stopColor="#4A2F1A" />
        </linearGradient>
        <linearGradient id={ids.leaf} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3FAE5E" />
          <stop offset="1" stopColor="#1C6B3A" />
        </linearGradient>
        <linearGradient id={ids.haze} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D8F1FF" stopOpacity="0" />
          <stop offset="1" stopColor="#D8F1FF" stopOpacity="0.7" />
        </linearGradient>
        <filter id={ids.blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <Grain id={ids.grain} strength={0.06} />
      </defs>
      <rect width="320" height="380" fill={`url(#${ids.sky})`} />
      <rect width="320" height="220" filter={`url(#${ids.clouds})`} mask={`url(#${ids.cloudMask})`} />
      <circle cx="232" cy="66" r="44" fill="#FFFBE0" opacity="0.4" filter={`url(#${ids.blur})`} />
      <circle cx="232" cy="66" r="18" fill="#FFFCEB" />
      {/* Distant island in haze */}
      <path d="M190 206 Q214 186 236 194 Q256 180 276 196 Q296 192 312 206 Z" fill="#3E7A6A" opacity="0.6" />
      <rect y="180" width="320" height="28" fill={`url(#${ids.haze})`} />
      {/* Ocean with sun glints and foam */}
      <rect y="206" width="320" height="64" fill={`url(#${ids.sea})`} />
      <rect y="206" width="320" height="64" filter={`url(#${ids.glint})`} mask={`url(#${ids.glintMask})`} opacity="0.9" />
      <path d="M0 252 Q30 246 60 252 T120 252 T180 252 T240 252 T320 250 L320 262 L0 262 Z" fill="#E8FBFF" opacity="0.6" filter={`url(#${ids.blur})`} />
      <path d="M0 256 Q40 250 80 257 T160 256 T240 257 T320 254" stroke="#FFFFFF" strokeWidth="2.5" fill="none" opacity="0.8" />
      {/* Sand: wet edge, dry beach, grain */}
      <path d="M0 260 Q160 248 320 260 L320 380 L0 380 Z" fill={`url(#${ids.sand})`} />
      <path d="M0 260 Q160 248 320 260 L320 380 L0 380 Z" filter={`url(#${ids.grainSand})`} />
      <ellipse cx="88" cy="352" rx="80" ry="10" fill="#7A5A30" opacity="0.25" filter={`url(#${ids.blur})`} />
      {/* Palm tree */}
      <path d="M38 352 Q30 260 66 168 L76 172 Q44 262 52 352 Z" fill={`url(#${ids.trunk})`} />
      <g stroke="#3A2414" strokeWidth="1.4" opacity="0.6">
        {[330, 300, 270, 240, 212, 188].map((y, i) => (
          <path key={y} d={`M${38 + i * 4.5} ${y} l${13 - i * 0.8} -3`} />
        ))}
      </g>
      <g fill={`url(#${ids.leaf})`} stroke="#145A2E" strokeWidth="1">
        <path d="M70 168 Q30 146 -6 172 Q30 158 50 166 Q30 164 6 180 Q44 168 70 176 Z" />
        <path d="M70 168 Q104 132 150 146 Q114 146 96 158 Q120 156 140 168 Q100 160 74 178 Z" />
        <path d="M70 168 Q56 120 18 112 Q48 130 58 146 Q40 132 22 132 Q54 146 66 176 Z" />
        <path d="M70 168 Q114 168 136 204 Q114 186 96 184 Q110 194 118 210 Q96 186 72 178 Z" />
        <path d="M70 168 Q82 122 118 104 Q96 130 92 146 Q106 132 124 128 Q94 146 76 176 Z" />
        <path d="M70 168 Q36 184 26 220 Q40 196 54 190 Q46 202 46 218 Q56 192 70 178 Z" />
      </g>
      <circle cx="66" cy="178" r="5.5" fill="#6B4527" />
      <circle cx="75" cy="181" r="5.5" fill="#5A381F" />
      <rect width="320" height="380" filter={`url(#${ids.grain})`} />
    </>
  )
  return <Stage className={className} wide={wide} still={still} />
}

function NeonArena({ className, wide }: SceneProps) {
  const ids = useSvgIds('bg', 'beam', 'haze', 'floor', 'reflect', 'grain', 'blur', 'crowd')
  const beams: [number, string][] = [[40, '#E879F9'], [160, '#22D3EE'], [280, '#E879F9']]
  const rows = [0, 1, 2, 3]
  const still = (
    <>
      <defs>
        <linearGradient id={ids.bg} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05040F" />
          <stop offset="0.6" stopColor="#140A2E" />
          <stop offset="1" stopColor="#0A0618" />
        </linearGradient>
        {beams.map(([x, c]) => (
          <linearGradient key={x} id={`${ids.beam}${x}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c} stopOpacity="0.6" />
            <stop offset="1" stopColor={c} stopOpacity="0" />
          </linearGradient>
        ))}
        <CloudFilter id={ids.haze} rgb={[0.8, 0.6, 1]} freq="0.012 0.02" seed={12} density={1.6} cut={0.75} />
        <linearGradient id={ids.floor} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B0F3A" />
          <stop offset="1" stopColor="#07040F" />
        </linearGradient>
        <linearGradient id={ids.reflect} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id={ids.blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <Grain id={ids.grain} strength={0.1} />
      </defs>
      <rect width="320" height="380" fill={`url(#${ids.bg})`} />
      {/* Roof truss and lights */}
      <path d="M0 26 L320 26 M0 40 L320 40" stroke="#2A2050" strokeWidth="2" />
      <path d={Array.from({ length: 16 }, (_, i) => `M${i * 20} 26 L${i * 20 + 10} 40 L${i * 20 + 20} 26`).join(' ')} stroke="#2A2050" strokeWidth="1.2" fill="none" />
      {/* Crowd: tiered rows of silhouettes with rim light */}
      {rows.map((r) => (
        <g key={r} opacity={0.55 + r * 0.12}>
          <rect x="0" y={150 + r * 22} width="320" height="22" fill={r % 2 ? '#120A26' : '#160C2E'} />
          {Array.from({ length: 26 }, (_, i) => {
            const x = i * 12.6 + (r % 2) * 6 + 4
            const y = 152 + r * 22
            return (
              <g key={i}>
                <circle cx={x} cy={y + 6} r={4} fill="#06040C" />
                <path d={`M${x - 6} ${y + 20} Q${x} ${y + 8} ${x + 6} ${y + 20} Z`} fill="#06040C" />
                <path d={`M${x - 3.5} ${y + 4} A4 4 0 0 1 ${x + 3.5} ${y + 4}`} stroke={i % 3 ? '#E879F9' : '#22D3EE'} strokeWidth="0.8" fill="none" opacity="0.5" />
              </g>
            )
          })}
        </g>
      ))}
      {/* LED ribbon board */}
      <rect x="0" y="236" width="320" height="14" fill="#0E0626" />
      <rect x="0" y="238" width="320" height="10" fill="#E879F9" opacity="0.25" />
      <path d="M0 243 L320 243" stroke="#F5C2FF" strokeWidth="1.5" strokeDasharray="14 6" />
      {/* Spotlight beams with haze inside */}
      {beams.map(([x], i) => (
        <path key={x} d={`M${x - 6} 34 L${x + 6} 34 L${x + 80 - i * 80} 300 L${x - 80 - i * 80 + 160} 300 Z`} fill={`url(#${ids.beam}${x})`} />
      ))}
      <rect width="320" height="300" filter={`url(#${ids.haze})`} opacity="0.25" />
      {[30, 70, 110, 160, 210, 250, 290].map((x) => (
        <g key={x}>
          <circle cx={x} cy="33" r="7" fill="#FFFFFF" opacity="0.35" filter={`url(#${ids.blur})`} />
          <circle cx={x} cy="33" r="3" fill="#FFFFFF" />
        </g>
      ))}
      {/* Glossy floor: reflections of the beams and board */}
      <path d="M0 250 L320 250 L320 380 L0 380 Z" fill={`url(#${ids.floor})`} />
      <g opacity="0.35" transform="translate(0 500) scale(1 -1)">
        {beams.map(([x], i) => (
          <path key={x} d={`M${x - 6} 250 L${x + 6} 250 L${x + 40 - i * 40} 120 L${x - 40 - i * 40 + 80} 120 Z`} fill={`url(#${ids.beam}${x})`} />
        ))}
      </g>
      <rect x="0" y="250" width="320" height="40" fill={`url(#${ids.reflect})`} opacity="0.3" />
      <g stroke="#22D3EE" strokeWidth="1.2" opacity="0.45">
        {Array.from({ length: 11 }, (_, i) => -100 + i * 52).map((x) => (
          <path key={x} d={`M160 250 L${x * 2.2 - 190} 380`} />
        ))}
        {[262, 280, 306, 342].map((y) => (
          <path key={y} d={`M0 ${y} L320 ${y}`} />
        ))}
      </g>
      <path d="M0 250 L320 250" stroke="#E879F9" strokeWidth="2.5" />
      <rect width="320" height="380" filter={`url(#${ids.grain})`} />
    </>
  )
  return <Stage className={className} wide={wide} still={still} />
}

/** Premium: deep space. Milky Way with dust lanes, nebulae, a ringed gas giant, a distant galaxy and a moon surface. */
function Galaxy({ className, wide }: SceneProps) {
  const ids = useSvgIds('bg', 'nebA', 'nebB', 'nebMaskA', 'nebMaskB', 'nebFadeA', 'nebFadeB', 'band', 'dust', 'bandMask', 'bandFade', 'planet', 'bands', 'planetClip', 'shade', 'rim', 'ring', 'far', 'ground', 'rock', 'grain', 'blur', 'soft', 'star', 'moon', 'moonShade', 'moonGlow', 'moonClip')
  const tints = ['#FFFFFF', '#CFE0FF', '#FFE9C4', '#FFC9B8', '#BFD4FF']
  const still = (
    <>
      <defs>
        <radialGradient id={ids.bg} cx="45%" cy="35%" r="80%">
          <stop offset="0" stopColor="#0E0B2A" />
          <stop offset="1" stopColor="#010008" />
        </radialGradient>
        <CloudFilter id={ids.nebA} rgb={[0.95, 0.35, 0.72]} freq="0.011 0.016" seed={21} density={2.3} cut={0.95} />
        <CloudFilter id={ids.nebB} rgb={[0.3, 0.6, 1]} freq="0.014" seed={33} density={2.3} cut={1.0} />
        <radialGradient id={ids.nebFadeA} cx="24%" cy="30%" r="42%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.nebFadeB} cx="80%" cy="58%" r="40%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <mask id={ids.nebMaskA}>
          <rect width="320" height="380" fill={`url(#${ids.nebFadeA})`} />
        </mask>
        <mask id={ids.nebMaskB}>
          <rect width="320" height="380" fill={`url(#${ids.nebFadeB})`} />
        </mask>
        <CloudFilter id={ids.band} rgb={[1, 0.93, 0.85]} freq="0.025 0.07" seed={5} density={2.6} cut={1.0} />
        <CloudFilter id={ids.dust} rgb={[0.03, 0.02, 0.06]} freq="0.03 0.09" seed={12} density={3.2} cut={1.4} />
        <linearGradient id={ids.bandFade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <mask id={ids.bandMask}>
          <rect x="-120" y="120" width="560" height="110" fill={`url(#${ids.bandFade})`} transform="rotate(-28 160 175)" />
        </mask>
        <radialGradient id={ids.planet} cx="32%" cy="30%" r="80%">
          <stop offset="0" stopColor="#FBE3B8" />
          <stop offset="0.5" stopColor="#D9A066" />
          <stop offset="1" stopColor="#6E4426" />
        </radialGradient>
        <filter id={ids.bands} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.11" numOctaves="4" seed="9" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.26  0 0 0 0 0.12  0 0 0 1.8 -0.55" />
        </filter>
        <clipPath id={ids.planetClip}>
          <circle r="40" />
        </clipPath>
        <radialGradient id={ids.shade} cx="80%" cy="82%" r="75%">
          <stop offset="0.35" stopColor="#02010A" stopOpacity="0" />
          <stop offset="1" stopColor="#02010A" stopOpacity="0.92" />
        </radialGradient>
        <radialGradient id={ids.rim}>
          <stop offset="0.86" stopColor="#FFD9A8" stopOpacity="0" />
          <stop offset="0.93" stopColor="#FFD9A8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#FFD9A8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.ring} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E8D3A8" stopOpacity="0.15" />
          <stop offset="0.5" stopColor="#FFF1D6" stopOpacity="0.95" />
          <stop offset="1" stopColor="#E8D3A8" stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id={ids.far}>
          <stop offset="0" stopColor="#FFF6E0" />
          <stop offset="0.25" stopColor="#E8C8FF" stopOpacity="0.7" />
          <stop offset="1" stopColor="#8C6CFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.ground} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8E93A3" />
          <stop offset="1" stopColor="#2C2F3A" />
        </linearGradient>
        <RockFilter id={ids.rock} light="#E6ECFF" scale={3} />
        <radialGradient id={ids.moon} cx="38%" cy="34%" r="75%">
          <stop offset="0" stopColor="#F4F1E8" />
          <stop offset="0.6" stopColor="#BDB8AE" />
          <stop offset="1" stopColor="#77736C" />
        </radialGradient>
        <radialGradient id={ids.moonShade} cx="85%" cy="70%" r="80%">
          <stop offset="0.35" stopColor="#05040C" stopOpacity="0" />
          <stop offset="1" stopColor="#05040C" stopOpacity="0.9" />
        </radialGradient>
        <radialGradient id={ids.moonGlow}>
          <stop offset="0.55" stopColor="#E9E4FF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#E9E4FF" stopOpacity="0" />
        </radialGradient>
        <clipPath id={ids.moonClip}>
          <circle r="26" />
        </clipPath>
        <radialGradient id={ids.star}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.3" stopColor="#CFE0FF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#CFE0FF" stopOpacity="0" />
        </radialGradient>
        <filter id={ids.blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id={ids.soft} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <Grain id={ids.grain} strength={0.07} />
      </defs>
      <rect width="320" height="380" fill={`url(#${ids.bg})`} />
      {/* Milky Way: a glowing band of stars cut by dark dust lanes */}
      <rect width="320" height="380" filter={`url(#${ids.band})`} mask={`url(#${ids.bandMask})`} opacity="0.6" />
      <g fill="#FFFFFF" mask={`url(#${ids.bandMask})`}>
        {scatter(260, 41, [0, 0, 320, 380]).map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r * 0.35} opacity={0.4 + (i % 4) * 0.15} />
        ))}
      </g>
      <rect width="320" height="380" filter={`url(#${ids.dust})`} mask={`url(#${ids.bandMask})`} opacity="0.85" />
      <rect width="320" height="380" filter={`url(#${ids.nebA})`} mask={`url(#${ids.nebMaskA})`} opacity="0.85" />
      <rect width="320" height="380" filter={`url(#${ids.nebB})`} mask={`url(#${ids.nebMaskB})`} opacity="0.75" />
      <g>
        {scatter(170, 7, [0, 0, 320, 310]).map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r * 0.5} fill={tints[i % tints.length]} opacity={0.35 + (i % 5) * 0.13} />
        ))}
      </g>
      {/* The moon: shaded, with maria and craters */}
      <g transform="translate(62 74)">
        <circle r="46" fill={`url(#${ids.moonGlow})`} />
        <circle r="26" fill={`url(#${ids.moon})`} filter={`url(#${ids.rock})`} />
        <g clipPath={`url(#${ids.moonClip})`}>
          <path d="M-14 -16 Q-2 -20 4 -10 Q10 -2 2 4 Q-8 8 -14 0 Q-20 -8 -14 -16 Z M6 8 Q16 6 18 14 Q14 22 6 18 Q0 14 6 8 Z" fill="#6E6A63" opacity="0.45" />
          {[[-8, 12, 4], [12, -12, 3], [16, 2, 2.5], [-18, 4, 2], [0, -4, 2]].map(([x, y, r]) => (
            <g key={`${x},${y}`}>
              <circle cx={x} cy={y} r={r} fill="#5E5A54" opacity="0.5" />
              <path d={`M${x - r} ${y} A${r} ${r} 0 0 0 ${x + r} ${y}`} stroke="#F4F1E8" strokeWidth="0.8" fill="none" opacity="0.6" />
            </g>
          ))}
        </g>
        <circle r="26" fill={`url(#${ids.moonShade})`} />
      </g>
      {/* A distant spiral galaxy */}
      <g transform="translate(36 224) rotate(-32) scale(0.75)">
        <ellipse rx="34" ry="10" fill={`url(#${ids.far})`} filter={`url(#${ids.soft})`} />
        <path d="M-30 2 Q-10 -12 4 -2 Q14 8 30 -3 M-26 -4 Q-6 10 8 2 Q18 -6 28 4" stroke="#E8C8FF" strokeWidth="1.2" fill="none" opacity="0.5" />
        <ellipse rx="5" ry="3" fill="#FFF6E0" />
      </g>
      {/* Bright stars with soft glows and diffraction spikes */}
      {[[132, 46, 1], [292, 196, 0.8], [26, 182, 0.7], [188, 236, 0.6], [104, 150, 0.55]].map(([x, y, k]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${k})`}>
          <circle r="10" fill={`url(#${ids.star})`} />
          <path d="M0 -16 L0.7 0 L0 16 L-0.7 0 Z M-16 0 L0 0.7 L16 0 L0 -0.7 Z" fill="#FFFFFF" opacity="0.85" />
          <circle r="1.8" fill="#FFFFFF" />
        </g>
      ))}
      {/* Ringed gas giant: banded clouds, terminator, rim light, rings with gaps and their shadow */}
      <g transform="translate(240 100)">
        <g transform="rotate(-16)" fill="none">
          <path d="M-74 0 A74 15 0 0 1 74 0" stroke={`url(#${ids.ring})`} strokeWidth="6" opacity="0.8" />
          <path d="M-63 0 A63 12.5 0 0 1 63 0" stroke={`url(#${ids.ring})`} strokeWidth="4" opacity="0.55" />
          <path d="M-55 0 A55 11 0 0 1 55 0" stroke={`url(#${ids.ring})`} strokeWidth="3" opacity="0.4" />
        </g>
        <circle r="40" fill={`url(#${ids.planet})`} />
        <g clipPath={`url(#${ids.planetClip})`}>
          <rect x="-40" y="-40" width="80" height="80" filter={`url(#${ids.bands})`} transform="rotate(-16)" />
          <ellipse cx="0" cy="8" rx="80" ry="7" fill="#000" opacity="0.35" transform="rotate(-16)" filter={`url(#${ids.blur})`} />
        </g>
        <circle r="40" fill={`url(#${ids.shade})`} />
        <circle r="46" fill={`url(#${ids.rim})`} />
        <g transform="rotate(-16)" fill="none">
          <path d="M-74 0 A74 15 0 0 0 74 0" stroke={`url(#${ids.ring})`} strokeWidth="6" />
          <path d="M-63 0 A63 12.5 0 0 0 63 0" stroke={`url(#${ids.ring})`} strokeWidth="4" opacity="0.75" />
          <path d="M-55 0 A55 11 0 0 0 55 0" stroke={`url(#${ids.ring})`} strokeWidth="3" opacity="0.55" />
        </g>
      </g>
      {/* Moon surface with craters */}
      <path d="M0 318 Q80 300 160 306 Q250 296 320 314 L320 380 L0 380 Z" fill={`url(#${ids.ground})`} filter={`url(#${ids.rock})`} />
      <path d="M0 318 Q80 300 160 306 Q250 296 320 314" stroke="#CFE0FF" strokeWidth="2" fill="none" opacity="0.45" filter={`url(#${ids.blur})`} />
      {[[44, 340, 18], [262, 334, 14], [120, 362, 10], [214, 366, 22], [302, 360, 9]].map(([x, y, r]) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.32} fill="#1E2029" opacity="0.7" />
          <path d={`M${x - r} ${y} A${r} ${r * 0.32} 0 0 0 ${x + r} ${y}`} stroke="#C9CEDB" strokeWidth="1.5" fill="none" opacity="0.6" />
        </g>
      ))}
      <rect width="320" height="380" filter={`url(#${ids.grain})`} />
    </>
  )
  const live = (
    <g>
      <g fill="#FFFFFF">
        {scatter(14, 99, [0, 0, 320, 290]).map(([x, y], i) => (
          <path key={i} d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" transform={`translate(${x} ${y})`} className={`cd-twinkle ${['', 'cd-d1', 'cd-d2', 'cd-d3'][i % 4]}`} />
        ))}
      </g>
      {[[300, 30, 0], [220, 14, 3.2]].map(([x, y, d]) => (
        <g key={x} className="cd-meteor" style={{ animationDelay: `${d}s` }}>
          <path d={`M${x} ${y} l34 -16`} stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
          <circle cx={x} cy={y} r="1.8" fill="#FFFFFF" />
        </g>
      ))}
    </g>
  )
  return <Stage className={className} wide={wide} still={still} live={live} />
}

/** Flame tongues along a line at height `y` (x positions with a size each). */
function flames(y: number, spots: [number, number][]) {
  return spots.map(([x, k]) => `M${x - 12 * k} ${y} Q${x - 16 * k} ${y - 26 * k} ${x - 4 * k} ${y - 44 * k} Q${x - 2 * k} ${y - 26 * k} ${x + 4 * k} ${y - 22 * k} Q${x + 2 * k} ${y - 40 * k} ${x + 10 * k} ${y - 58 * k} Q${x + 22 * k} ${y - 26 * k} ${x + 12 * k} ${y} Z`).join(' ')
}

/** Premium: the gates of hell. A burning sky, horned gate with a blazing portal, hanging chains and a sea of fire. */
function DragonLair({ className, wide }: SceneProps) {
  const ids = useSvgIds('bg', 'rock', 'fire', 'fireTex', 'glow', 'portal', 'smoke', 'smokeMask', 'smokeFade', 'grain', 'blur', 'blurBig')
  const chain = (x0: number, y1: number, sway: number) =>
    Array.from({ length: Math.floor(y1 / 9) }, (_, i) => {
      const t = i / Math.floor(y1 / 9)
      return <ellipse key={i} cx={x0 + Math.sin(t * Math.PI) * sway} cy={i * 9 + 4} rx={i % 2 ? 1.6 : 3} ry="5" fill="none" stroke="#2A1614" strokeWidth="2" />
    })
  const still = (
    <>
      <defs>
        <linearGradient id={ids.bg} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#080102" />
          <stop offset="0.45" stopColor="#3A0507" />
          <stop offset="0.75" stopColor="#8E1508" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>
        <RockFilter id={ids.rock} light="#FF6A3C" scale={5} />
        <linearGradient id={ids.fire} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF1A8" />
          <stop offset="0.3" stopColor="#FF9A2E" />
          <stop offset="0.7" stopColor="#E0360F" />
          <stop offset="1" stopColor="#7A0D06" />
        </linearGradient>
        <filter id={ids.fireTex} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.16" numOctaves="4" seed="21" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.02  0 0 0 0 0.01  0 0 0 2.6 -1.2" />
        </filter>
        <radialGradient id={ids.glow}>
          <stop offset="0" stopColor="#FF5A1F" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FF5A1F" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.portal} cx="50%" cy="65%" r="70%">
          <stop offset="0" stopColor="#FFF1A8" />
          <stop offset="0.3" stopColor="#FF8A1F" />
          <stop offset="0.7" stopColor="#B8160C" />
          <stop offset="1" stopColor="#3A0507" />
        </radialGradient>
        <CloudFilter id={ids.smoke} rgb={[0.16, 0.02, 0.02]} freq="0.012 0.028" seed={31} density={2.6} cut={0.9} />
        <linearGradient id={ids.smokeFade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <mask id={ids.smokeMask}>
          <rect width="320" height="230" fill={`url(#${ids.smokeFade})`} />
        </mask>
        <filter id={ids.blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={ids.blurBig} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <Grain id={ids.grain} strength={0.1} />
      </defs>
      <rect width="320" height="380" fill={`url(#${ids.bg})`} />
      <rect width="320" height="230" filter={`url(#${ids.smoke})`} mask={`url(#${ids.smokeMask})`} />
      <ellipse cx="160" cy="262" rx="200" ry="70" fill={`url(#${ids.glow})`} />
      {/* Distant spires of the burning city, silhouetted against the fire */}
      <path d="M0 262 L0 196 L12 210 L22 150 L32 214 L48 190 L58 120 L70 206 L84 226 L96 178 L104 236 L216 236 L224 170 L238 222 L252 132 L262 200 L276 186 L288 104 L298 212 L310 168 L320 200 L320 262 Z" fill="#1A0404" filter={`url(#${ids.rock})`} />
      <path d="M0 250 Q160 228 320 250" stroke="#FF7A2E" strokeWidth="14" fill="none" opacity="0.55" filter={`url(#${ids.blurBig})`} />
      {/* The horned gate with a blazing portal */}
      <ellipse cx="160" cy="200" rx="86" ry="104" fill="#FF5A1F" opacity="0.35" filter={`url(#${ids.blurBig})`} />
      <path d="M100 300 L100 170 Q100 104 160 100 Q220 104 220 170 L220 300 Z" fill={`url(#${ids.portal})`} />
      <path d="M100 300 L100 170 Q100 104 160 100 Q220 104 220 170 L220 300" filter={`url(#${ids.fireTex})`} />
      <path
        d="M72 300 L72 170 Q72 82 160 76 Q248 82 248 170 L248 300 L220 300 L220 170 Q220 104 160 100 Q100 104 100 170 L100 300 Z"
        fill="#2A0808"
        filter={`url(#${ids.rock})`}
      />
      <path d="M86 98 Q50 60 58 10 Q78 58 106 82 Z M234 98 Q270 60 262 10 Q242 58 214 82 Z" fill="#2A0808" filter={`url(#${ids.rock})`} />
      <path d="M86 98 Q50 60 58 10 M234 98 Q270 60 262 10" stroke="#FF7A2E" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M160 76 L150 92 L160 106 L170 92 Z" fill="#FF8A1F" />
      <path d="M86 140 L94 170 L84 196 M236 150 L226 182 L238 210 M120 82 L132 92 M200 82 L188 92" stroke="#FF8A1F" strokeWidth="2" fill="none" opacity="0.85" />
      {/* Chains hanging in the smoke */}
      <g opacity="0.9">
        {chain(30, 120, 6)}
        <g transform="translate(262 0)">{chain(0, 84, -5)}</g>
        <g transform="translate(296 0)">{chain(0, 150, 4)}</g>
      </g>
      {/* Sea of fire */}
      <path d="M0 300 Q80 288 160 298 Q240 308 320 294 L320 346 L0 346 Z" fill={`url(#${ids.fire})`} />
      <path d="M0 300 Q80 288 160 298 Q240 308 320 294 L320 346 L0 346 Z" filter={`url(#${ids.fireTex})`} />
      <path d={flames(304, [[14, 0.8], [52, 1.1], [98, 0.7], [226, 0.8], [268, 1.2], [308, 0.7]])} fill="#FF9A2E" opacity="0.9" />
      {/* Scorched ledge the character stands on */}
      <path d="M0 340 Q60 326 160 330 Q260 326 320 340 L320 380 L0 380 Z" fill="#1E0606" filter={`url(#${ids.rock})`} />
      <path d="M0 340 Q60 326 160 330 Q260 326 320 340" stroke="#FF7A2E" strokeWidth="3" fill="none" opacity="0.7" filter={`url(#${ids.blur})`} />
      <path d="M40 352 L70 360 L96 354 M210 356 L240 362 L272 352" stroke="#FF6A1F" strokeWidth="1.5" fill="none" opacity="0.75" />
      <rect width="320" height="380" filter={`url(#${ids.grain})`} />
    </>
  )
  const live = (
    <g>
      {[[34, 1], [80, 1.3], [132, 0.9], [190, 1], [246, 1.4], [292, 1]].map(([x, k], i) => (
        <path key={x} d={flames(318, [[x, k]])} fill={i % 2 ? '#FFB347' : '#FF6A1F'} className="cd-flick" style={{ animationDelay: `${i * 0.13}s` }} />
      ))}
      <g fill="#FFB347">
        {scatter(26, 5, [10, 100, 300, 220]).map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r + 0.2} className="cd-rise" style={{ animationDelay: `${(i % 8) * 0.4}s` }} />
        ))}
      </g>
    </g>
  )
  return <Stage className={className} wide={wide} still={still} live={live} />
}

/** Premium: the edge of a black hole. A glowing accretion disk bent over the top by gravity, orbiting light, floating rocks and an obsidian platform. */
function VoidRealm({ className, wide }: SceneProps) {
  const ids = useSvgIds('bg', 'cloud', 'cloudMask', 'cloudFade', 'halo', 'disk', 'diskTex', 'diskMask', 'top', 'bottom', 'rock', 'glass', 'grain', 'blur', 'soft')
  const cx = 160
  const cy = 138
  const ring = (rx: number, ry: number, ix: number, iy: number) =>
    `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z M${cx - ix} ${cy} A${ix} ${iy} 0 1 1 ${cx + ix} ${cy} A${ix} ${iy} 0 1 1 ${cx - ix} ${cy} Z`
  const disk = ring(132, 26, 46, 9)
  const still = (
    <>
      <defs>
        <radialGradient id={ids.bg} cx="50%" cy="36%" r="80%">
          <stop offset="0" stopColor="#2A1248" />
          <stop offset="0.45" stopColor="#0C0618" />
          <stop offset="1" stopColor="#010003" />
        </radialGradient>
        <CloudFilter id={ids.cloud} rgb={[0.5, 0.26, 0.9]} freq="0.008 0.018" seed={17} density={2.1} cut={0.95} />
        <radialGradient id={ids.cloudFade} cx="50%" cy="38%" r="60%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.05" />
        </radialGradient>
        <mask id={ids.cloudMask}>
          <rect width="320" height="380" fill={`url(#${ids.cloudFade})`} />
        </mask>
        <radialGradient id={ids.halo}>
          <stop offset="0" stopColor="#C9A8FF" stopOpacity="0.7" />
          <stop offset="0.5" stopColor="#7B3FE0" stopOpacity="0.25" />
          <stop offset="1" stopColor="#7B3FE0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.disk}>
          <stop offset="0.3" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#F0E2FF" />
          <stop offset="0.65" stopColor="#B48CFF" />
          <stop offset="0.85" stopColor="#6B2FC8" stopOpacity="0.7" />
          <stop offset="1" stopColor="#3A1470" stopOpacity="0" />
        </radialGradient>
        <filter id={ids.diskTex} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.3" numOctaves="3" seed="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.02  0 0 0 0 0.2  0 0 0 2.2 -0.9" />
        </filter>
        <mask id={ids.diskMask}>
          <path d={disk} fill="#FFFFFF" fillRule="evenodd" />
        </mask>
        <clipPath id={ids.top}>
          <rect width="320" height={cy} />
        </clipPath>
        <clipPath id={ids.bottom}>
          <rect y={cy} width="320" height={380 - cy} />
        </clipPath>
        <RockFilter id={ids.rock} light="#C9A8FF" scale={4} />
        <linearGradient id={ids.glass} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A1A48" />
          <stop offset="1" stopColor="#05030A" />
        </linearGradient>
        <filter id={ids.blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id={ids.soft} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <Grain id={ids.grain} strength={0.09} />
      </defs>
      <rect width="320" height="380" fill={`url(#${ids.bg})`} />
      <rect width="320" height="380" filter={`url(#${ids.cloud})`} mask={`url(#${ids.cloudMask})`} opacity="0.6" />
      <g>
        {scatter(140, 11, [0, 0, 320, 320]).map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r * 0.45} fill={i % 3 ? '#FFFFFF' : '#D9C6FF'} opacity={0.3 + (i % 4) * 0.15} />
        ))}
      </g>
      <ellipse cx={cx} cy={cy} rx="170" ry="110" fill={`url(#${ids.halo})`} />
      {/* Far side of the disk, behind the hole */}
      <g clipPath={`url(#${ids.top})`}>
        <path d={disk} fill={`url(#${ids.disk})`} fillRule="evenodd" />
        <rect width="320" height="380" filter={`url(#${ids.diskTex})`} mask={`url(#${ids.diskMask})`} />
      </g>
      {/* Event horizon with its photon ring, and the disk's light bent over the top */}
      <circle cx={cx} cy={cy} r="44" fill="#E9DBFF" opacity="0.5" filter={`url(#${ids.soft})`} />
      <circle cx={cx} cy={cy} r="38" fill="#000000" />
      <circle cx={cx} cy={cy} r="39" fill="none" stroke="#F6EEFF" strokeWidth="1.6" filter={`url(#${ids.blur})`} />
      <g clipPath={`url(#${ids.top})`}>
        <ellipse cx={cx} cy={cy + 4} rx="58" ry="52" fill="none" stroke="#F0E2FF" strokeWidth="9" opacity="0.85" filter={`url(#${ids.blur})`} />
        <ellipse cx={cx} cy={cy + 4} rx="58" ry="52" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
        <ellipse cx={cx} cy={cy + 4} rx="70" ry="62" fill="none" stroke="#9B5CFF" strokeWidth="10" opacity="0.35" filter={`url(#${ids.soft})`} />
      </g>
      <ellipse cx={cx} cy={cy + 6} rx="46" ry="16" fill="none" stroke="#F0E2FF" strokeWidth="3" opacity="0.5" clipPath={`url(#${ids.bottom})`} filter={`url(#${ids.blur})`} />
      {/* Near side of the disk, in front of the hole */}
      <g clipPath={`url(#${ids.bottom})`}>
        <path d={disk} fill={`url(#${ids.disk})`} fillRule="evenodd" />
        <rect width="320" height="380" filter={`url(#${ids.diskTex})`} mask={`url(#${ids.diskMask})`} />
      </g>
      <path d={`M${cx - 132} ${cy} A132 26 0 0 0 ${cx + 132} ${cy}`} stroke="#E9DBFF" strokeWidth="4" fill="none" opacity="0.4" filter={`url(#${ids.blur})`} />
      {/* Floating rocks, lit from the hole */}
      {[[44, 230, 1, 1], [282, 236, 0.85, -1], [258, 62, 0.6, -1], [58, 58, 0.5, 1]].map(([x, y, k, side]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${k})`}>
          <path d="M-30 -2 L-18 -16 L4 -18 L26 -8 L32 6 L18 22 L2 34 L-14 24 L-28 12 Z" fill="#241638" filter={`url(#${ids.rock})`} />
          <path d={side > 0 ? 'M4 -18 L26 -8 L32 6' : 'M-18 -16 L-30 -2 L-28 12'} stroke="#D9C6FF" strokeWidth="2.2" fill="none" strokeLinejoin="round" opacity="0.85" />
          <ellipse cx="0" cy="44" rx="12" ry="4" fill="#9B5CFF" opacity="0.35" filter={`url(#${ids.blur})`} />
        </g>
      ))}
      {/* Obsidian platform */}
      <path d="M0 316 L36 300 L70 312 L112 296 L160 304 L208 294 L250 310 L290 298 L320 312 L320 380 L0 380 Z" fill={`url(#${ids.glass})`} />
      <path d="M0 316 L36 300 L70 312 L112 296 L160 304 L208 294 L250 310 L290 298 L320 312" stroke="#B48CFF" strokeWidth="1.6" fill="none" opacity="0.7" />
      <path d="M36 300 L52 380 M112 296 L96 380 M208 294 L226 380 M290 298 L276 380" stroke="#6B3FB0" strokeWidth="1" opacity="0.5" />
      <ellipse cx="160" cy="336" rx="130" ry="24" fill="none" stroke="#9B5CFF" strokeWidth="10" opacity="0.28" filter={`url(#${ids.soft})`} />
      <rect width="320" height="380" filter={`url(#${ids.grain})`} />
    </>
  )
  const live = (
    <g>
      {/* Light orbiting in the disk (a spin squashed into the disk's tilt) */}
      <g transform={`translate(${cx} ${cy}) scale(1 0.2)`}>
        <g className="cd-spin">
          {scatter(26, 23, [0, 0, 1, 1]).map(([u, v], i) => {
            const a = u * Math.PI * 2
            const r = 60 + v * 64
            return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={1.4 + (i % 3) * 0.6} fill={i % 2 ? '#FFFFFF' : '#D9C6FF'} opacity="0.8" />
          })}
        </g>
      </g>
      <ellipse cx="160" cy="336" rx="130" ry="24" fill="none" stroke="#B48CFF" strokeWidth="2.5" strokeDasharray="10 8" className="cd-dash" />
    </g>
  )
  return <Stage className={className} wide={wide} still={still} live={live} />
}
