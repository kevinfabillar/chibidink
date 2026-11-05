import type { Appearance } from '../../api/types'
import { shade } from '../../lib/color'

// The paddle character, from the "Sprout — 3D Chibi Character" design. The face is described once as
// shapes and drawn by both the 2D avatar (SVG) and the 3D head (canvas texture), so they always match.
// Coordinates are the design's: a 600 × 770 stage, paddle face x 120..480, y 80..490, feet at y 748.

type Option = { id: string; label: string }

export const BODY_COLORS = ['#F2A65A', '#7CC6A4', '#A99BE0', '#6FA8DC', '#F28B9B', '#E8D36A', '#F7B6D2', '#EAD9C6',
  // darker and neutral bodies
  '#3A3F4B', '#2B3A55', '#4B2E83', '#2F5D3A', '#7A1F33', '#6B4527', '#1E1F24', '#F4F1EA']
export const EDGE_COLORS = ['#1F2A37', '#B88A2E', '#E9EEF5', '#4A2340', '#0B0D12', '#7A1F24', '#1F4E3D', '#3B2A78', '#5A381F', '#9AA3B2']
export const EYE_COLORS = ['#4A8FD9', '#2F9E5B', '#C27C0E', '#8B5CF6', '#D9465A', '#14A3A3', '#E05CA8', '#6B4A3A', '#1E1820', '#2B3A55', '#3B2A78', '#5A381F', '#7A1F24', '#9AA3B2']
export const GRIP_COLORS = ['#2E333E', '#6B4527', '#9E2B3A', '#2B4579', '#2F5D3A', '#D9D2C3', '#0B0D12', '#4B2E83', '#F2A65A', '#B7F33B', '#FF5CA8', '#7A1F24']

export const EYE_STYLES: Option[] = [
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'round', label: 'Round' },
  { id: 'happy', label: 'Happy' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'star', label: 'Star' },
  { id: 'dot', label: 'Button' },
  { id: 'lashes', label: 'Lashes' },
  { id: 'wink', label: 'Wink' },
  { id: 'heart', label: 'Hearts' },
  { id: 'fierce', label: 'Fierce' },
  { id: 'dizzy', label: 'Dizzy' },
]
export const BROW_STYLES: Option[] = [
  { id: 'determined', label: 'Determined' },
  { id: 'soft', label: 'Soft' },
  { id: 'raised', label: 'Raised' },
  { id: 'worried', label: 'Worried' },
  { id: 'arched', label: 'Arched' },
  { id: 'angry', label: 'Angry' },
  { id: 'none', label: 'None' },
]
export const MOUTH_STYLES: Option[] = [
  { id: 'smirk', label: 'Smirk' },
  { id: 'grin', label: 'Grin' },
  { id: 'wow', label: 'Wow' },
  { id: 'cat', label: 'Cat' },
  { id: 'blep', label: 'Blep' },
  { id: 'flat', label: 'Flat' },
  { id: 'lips', label: 'Lipstick' },
  { id: 'kiss', label: 'Kiss' },
  { id: 'fang', label: 'Fang' },
  { id: 'wavy', label: 'Wavy' },
]
export const CHEEK_STYLES: Option[] = [
  { id: 'blush', label: 'Blush' },
  { id: 'freckles', label: 'Freckles' },
  { id: 'hearts', label: 'Hearts' },
  { id: 'shy', label: 'Shy' },
  { id: 'none', label: 'None' },
]
export const FACE_MARKS: Option[] = [
  { id: 'scar', label: 'Scar' },
  { id: 'bandage', label: 'Bandage' },
  { id: 'star', label: 'Star sticker' },
  { id: 'mole', label: 'Beauty mark' },
  { id: 'heart', label: 'Heart sticker' },
  { id: 'flower', label: 'Flower' },
  { id: 'none', label: 'None' },
]
export const GRIP_WRAPS: Option[] = [
  { id: 'diagonal', label: 'Diagonal' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'cross', label: 'Crosshatch' },
  { id: 'zigzag', label: 'Zigzag' },
  { id: 'dots', label: 'Polka dots' },
  { id: 'checker', label: 'Checker' },
  { id: 'bands', label: 'Bold bands' },
  { id: 'racing', label: 'Racing stripe' },
  { id: 'spiral', label: 'Tight spiral' },
  { id: 'plain', label: 'Plain' },
]
export const HANDLE_SHAPES: Option[] = [
  { id: 'slim', label: 'Slim' },
  { id: 'classic', label: 'Classic' },
  { id: 'chunky', label: 'Chunky' },
]
export const END_CAPS: Option[] = [
  { id: 'round', label: 'Round cap' },
  { id: 'pommel', label: 'Gold pommel' },
  { id: 'ball', label: 'Pickleball' },
  { id: 'flat', label: 'Flat cap' },
  { id: 'ring', label: 'Steel ring' },
  { id: 'gem', label: 'Gem cap' },
  { id: 'star', label: 'Star cap' },
]
/** End cap colours (the pickleball cap keeps its own yellow). */
export const END_CAP_COLORS = ['#1A1D24', '#D9AE4A', '#C9D1DC', '#D93A45', '#2B4579', '#2F9E5B', '#8B5CF6', '#FF5CA8', '#B7F33B', '#F4F6F9']

export const DEFAULT_APPEARANCE: Appearance = {
  bodyColor: BODY_COLORS[0],
  edgeColor: EDGE_COLORS[0],
  eyeStyle: 'sparkle',
  eyeColor: EYE_COLORS[0],
  browStyle: 'soft',
  mouthStyle: 'smirk',
  cheekStyle: 'blush',
  faceMark: 'none',
  gripColor: GRIP_COLORS[0],
  gripWrap: 'diagonal',
  handleShape: 'classic',
  endCap: 'round',
  endCapColor: '#1A1D24',
}

/** Fills in anything missing (e.g. an older saved look) with the default. */
export const withDefaults = (a: Partial<Appearance> | null | undefined): Appearance => ({ ...DEFAULT_APPEARANCE, ...a })

/** Width of the handle (the knight's body) in design units. */
export const handleWidth = (shape: string) => ({ slim: 60, classic: 76, chunky: 96 })[shape] ?? 76

/** Wrap lines are dark on a light grip and light on a dark one. */
export function wrapInk(grip: string) {
  const n = parseInt(grip.slice(1), 16)
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return l > 0.6 ? '#000000' : '#FFFFFF'
}

// ---- Face shapes ----------------------------------------------------------------------------------

export type Paint = string | { y0: number; y1: number; stops: [number, string][] }
export type FaceShape =
  | { kind: 'path'; d: string; fill?: Paint; stroke?: string; width?: number; opacity?: number; evenodd?: boolean }
  | { kind: 'blush'; cx: number; cy: number; rx: number; ry: number; color: string; opacity: number }

const DARK_INK = '#2A2230'
const LIGHT_INK = '#F3EEE6'
/** Line colour for the face being built: dark on light bodies, light on dark ones (set by faceShapes). */
let INK = DARK_INK

/** True for dark colours (brightness under about 40%). */
export const isDarkColor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 < 0.4
}

const ellipse = (cx: number, cy: number, rx: number, ry = rx) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`

const STAR = [[0, -34], [8.7, -12], [32.3, -10.5], [14.1, 4.6], [20, 27.5], [0, 14.9], [-20, 27.5], [-14.1, 4.6], [-32.3, -10.5], [-8.7, -12]]
const star = (cx: number, cy: number, k = 1) => 'M' + STAR.map(([x, y]) => `${cx + x * k} ${cy + y * k}`).join(' L') + ' Z'

/** A heart centred on (cx, cy), about 2·s wide. */
export const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + s * 0.9} C${cx - s * 1.5} ${cy - s * 0.1} ${cx - s * 0.75} ${cy - s * 1.15} ${cx} ${cy - s * 0.42} C${cx + s * 0.75} ${cy - s * 1.15} ${cx + s * 1.5} ${cy - s * 0.1} ${cx} ${cy + s * 0.9} Z`

const fill = (d: string, f: Paint, opacity?: number): FaceShape => ({ kind: 'path', d, fill: f, opacity })
const line = (d: string, width: number, stroke = INK, opacity?: number): FaceShape => ({ kind: 'path', d, stroke, width, opacity })

const BROWS: Record<string, string> = {
  determined: 'M204 246 Q228 248 254 258 M346 258 Q372 248 396 246',
  soft: 'M206 252 Q230 238 254 248 M346 248 Q370 238 394 252',
  raised: 'M208 236 Q230 222 252 232 M348 232 Q370 222 392 236',
  worried: 'M204 258 Q230 254 252 240 M348 240 Q370 254 396 258',
  arched: 'M204 250 Q224 226 256 238 M344 238 Q376 226 396 250',
  angry: 'M206 238 Q232 246 258 262 M342 262 Q368 246 394 238',
}
const BROW_WIDTH: Record<string, number> = { arched: 5 }

function eyes(style: string, color: string): FaceShape[] {
  const grad = (cy: number, r: number): Paint => ({ y0: cy - r, y1: cy + r, stops: [[0, '#1E1820'], [0.55, shade(color, -0.55)], [1, color]] })
  const out: FaceShape[] = []
  const sparkle = (cx: number) => {
    out.push(fill(ellipse(cx, 304, 29, 36), grad(304, 36)))
    out.push(fill(ellipse(cx + 11, 290, 10), '#FFFFFF'), fill(ellipse(cx - 9, 320, 5), '#FFFFFF', 0.9))
  }
  for (const cx of [232, 368]) {
    const o = cx < 300 ? -1 : 1 // outer side of this eye
    switch (style) {
      case 'lashes':
        sparkle(cx)
        out.push(line(`M${cx - 32} 296 Q${cx} 258 ${cx + 32} 296`, 6))
        out.push(line(`M${cx + o * 28} 284 L${cx + o * 44} 272 M${cx + o * 16} 272 L${cx + o * 26} 256`, 5))
        break
      case 'wink':
        if (o < 0) sparkle(cx)
        else out.push(line(`M${cx + 24} 284 L${cx - 22} 306 L${cx + 24} 326`, 8))
        break
      case 'heart':
        out.push({ kind: 'path', d: heart(cx, 304, 30), fill: grad(304, 32), stroke: INK, width: 3 })
        out.push(fill(ellipse(cx - 12, 292, 7, 9), '#FFFFFF', 0.9))
        break
      case 'fierce':
        out.push(fill(`M${cx + o * 31} 286 L${cx - o * 31} 304 Q${cx - o * 31} 338 ${cx} 338 Q${cx + o * 31} 338 ${cx + o * 31} 286 Z`, grad(316, 24)))
        out.push(line(`M${cx + o * 36} 283 L${cx - o * 34} 305`, 7), fill(ellipse(cx - o * 2, 314, 6), '#FFFFFF'))
        break
      case 'dizzy':
        out.push(line(`M${cx} 306 m-4 0 a4 4 0 1 1 8 0 a10 10 0 1 1 -20 0 a16 16 0 1 1 32 0 a22 22 0 1 1 -44 0`, 5))
        break
      case 'round':
        out.push({ kind: 'path', d: ellipse(cx, 306, 33), fill: grad(306, 33), stroke: INK, width: 3 })
        out.push(fill(ellipse(cx + 10, 294, 12), '#FFFFFF'), fill(ellipse(cx - 12, 319, 5), '#FFFFFF'))
        break
      case 'happy':
        out.push(line(`M${cx - 28} 314 Q${cx} 278 ${cx + 28} 314`, 8))
        break
      case 'sleepy':
        out.push(fill(`M${cx - 29} 302 L${cx + 29} 302 Q${cx + 29} 338 ${cx} 338 Q${cx - 29} 338 ${cx - 29} 302 Z`, grad(320, 18)))
        out.push(line(`M${cx - 34} 302 L${cx + 34} 302`, 7), fill(ellipse(cx + 9, 314, 6), '#FFFFFF'))
        break
      case 'star':
        out.push({ kind: 'path', d: star(cx, 306), fill: grad(306, 32), stroke: INK, width: 3 })
        out.push(fill(ellipse(cx + 5, 302, 5), '#FFFFFF'))
        break
      case 'dot':
        out.push(fill(ellipse(cx, 306, 13, 18), '#1E1820'), fill(ellipse(cx + 4, 299, 4.5), '#FFFFFF'))
        break
      default:
        sparkle(cx)
    }
  }
  return out
}

function mouth(style: string): FaceShape[] {
  switch (style) {
    case 'grin':
      return [
        fill('M268 344 L336 344 Q334 384 302 384 Q270 384 268 344 Z', '#7A2238'),
        fill(ellipse(302, 374, 16, 8), '#FF8A9A'),
        fill('M272 344 L332 344 L330 353 L274 353 Z', '#FFFFFF'),
      ]
    case 'wow':
      return [fill(ellipse(302, 360, 15, 19), '#7A2238'), fill(ellipse(302, 370, 9, 6), '#FF8A9A')]
    case 'cat':
      return [line('M274 350 Q288 366 302 350 Q316 366 330 350', 6)]
    case 'blep':
      return [
        { kind: 'path', d: 'M296 356 Q296 376 306 376 Q316 376 314 356 Z', fill: '#FF7F96', stroke: '#A83E55', width: 2 },
        line('M280 350 Q302 364 324 350', 6),
      ]
    case 'flat':
      return [line('M284 356 L320 356', 6)]
    case 'lips':
      return [
        fill('M276 350 Q290 338 302 347 Q314 338 328 350 Q318 374 302 374 Q286 374 276 350 Z', '#E0457B'),
        line('M280 351 Q302 360 324 351', 3, '#A8285A'),
        fill(ellipse(312, 364, 6, 3), '#FFFFFF', 0.55),
      ]
    case 'kiss':
      return [line('M296 340 Q314 348 300 356 Q316 364 298 372', 6), fill(heart(342, 330, 11), '#FF6B95')]
    case 'fang':
      return [line('M274 348 Q302 376 330 348', 6), { kind: 'path', d: 'M282 357 L296 364 L288 376 Z', fill: '#FFFFFF', stroke: INK, width: 2 }]
    case 'wavy':
      return [line('M272 358 Q280 346 288 358 Q296 370 304 358 Q312 346 320 358 Q328 370 334 358', 5)]
    default: // smirk
      return [fill('M280 352 Q302 372 324 348 Q302 358 280 352 Z', '#A83E55')]
  }
}

function cheeks(style: string): FaceShape[] {
  if (style === 'blush')
    return [192, 408].map((cx) => ({ kind: 'blush', cx, cy: 356, rx: 30, ry: 17, color: '#FF7F96', opacity: 0.6 }) as FaceShape)
  if (style === 'hearts')
    return [192, 408].flatMap((cx): FaceShape[] => [
      { kind: 'blush', cx, cy: 356, rx: 30, ry: 17, color: '#FF7F96', opacity: 0.35 },
      fill(heart(cx, 354, 11), '#FF5C8A', 0.85),
    ])
  if (style === 'shy')
    return [192, 408].flatMap((cx): FaceShape[] => [
      { kind: 'blush', cx, cy: 356, rx: 34, ry: 19, color: '#FF6F8E', opacity: 0.75 },
      line(`M${cx - 14} 348 L${cx - 20} 362 M${cx} 348 L${cx - 6} 362 M${cx + 14} 348 L${cx + 8} 362`, 3, '#D94A6E', 0.7),
    ])
  if (style === 'freckles')
    return [[180, 352, 3.5], [194, 360, 3.5], [206, 350, 3], [394, 350, 3], [406, 360, 3.5], [420, 352, 3.5]].map(([x, y, r]) =>
      fill(ellipse(x, y, r), '#9A5A2E', 0.6),
    )
  return []
}

function mark(style: string): FaceShape[] {
  switch (style) {
    case 'scar':
      return [line('M420 260 L440 290 M426 282 L438 272', 4, '#7A4A3A', 0.6)]
    case 'bandage': {
      // A plaster at -30°, written out so it needs no transforms.
      const at = (x: number, y: number) => {
        const c = Math.cos(-Math.PI / 6)
        const s = Math.sin(-Math.PI / 6)
        return `${424 + x * c - y * s} ${276 + x * s + y * c}`
      }
      const quad = (x0: number, y0: number, x1: number, y1: number) => `M${at(x0, y0)} L${at(x1, y0)} L${at(x1, y1)} L${at(x0, y1)} Z`
      return [
        { kind: 'path', d: quad(-28, -9, 28, 9), fill: '#F3D3B0', stroke: '#C9A27A', width: 2 },
        fill(quad(-9, -9, 9, 9), '#E2BB92'),
      ]
    }
    case 'mole':
      return [fill(ellipse(398, 376, 5), '#4A2A20', 0.85)]
    case 'heart':
      return [{ kind: 'path', d: heart(426, 276, 17), fill: { y0: 258, y1: 292, stops: [[0, '#FF9FB8'], [1, '#E0326A']] }, stroke: '#FFFFFF', width: 3 }]
    case 'flower':
      return [
        ...[0, 72, 144, 216, 288].map((deg) => {
          const t = (deg * Math.PI) / 180
          return fill(ellipse(426 + Math.sin(t) * 11, 274 - Math.cos(t) * 11, 9), '#FFB3C7')
        }),
        fill(ellipse(426, 274, 6), '#FDE047'),
      ]
    case 'star':
      return [{ kind: 'path', d: star(426, 276, 0.55), fill: { y0: 257, y1: 291, stops: [[0, '#FBE7A1'], [0.5, '#D9AE4A'], [1, '#94701F']] }, stroke: '#94701F', width: 2 }]
    default:
      return []
  }
}

const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`

/** The ninja's eye slit: the only part of the face the hood leaves open. */
const SLIT = { x: 148, y: 226, w: 304, h: 128, r: 64 }

/** Under the face: the ninja's slit is filled with the body colour (the 3D head under the hood is dark). */
function gearUnder(gear: string | undefined, body: string): FaceShape[] {
  if (gear !== 'ninja') return []
  const { x, y, w, h, r } = SLIT
  return [fill(rrect(x, y, w, h, r), { y0: y, y1: y + h, stops: [[0, shade(body, 0.3)], [0.5, body], [1, shade(body, -0.2)]] })]
}

/** Face pieces that come with gear: the pirate's eyepatch, the ninja's hood. */
function gearFace(gear?: string): FaceShape[] {
  if (gear === 'ninja') {
    const { x, y, w, h, r } = SLIT
    return [
      {
        kind: 'path',
        d: rrect(120, 80, 360, 410, 150) + ' ' + rrect(x, y, w, h, r),
        evenodd: true,
        fill: { y0: 80, y1: 490, stops: [[0, '#3A4060'], [0.45, '#262B40'], [1, '#1A1D2C']] },
      },
      { kind: 'path', d: rrect(x, y, w, h, r), stroke: '#1A1D2C', width: 4 },
      line('M226 398 Q300 412 374 398 M246 428 Q300 438 354 428', 4, '#3A4060'),
      line('M170 140 Q220 104 290 98', 10, '#FFFFFF', 0.16),
    ]
  }
  if (gear === 'void')
    return [
      fill('M120 340 L120 230 A150 150 0 0 1 270 80 L330 80 A150 150 0 0 1 480 230 L480 340 Z', {
        y0: 150,
        y1: 330,
        stops: [[0, '#000000E0'], [0.55, '#00000066'], [1, '#00000000']],
      }),
      { kind: 'blush', cx: 232, cy: 304, rx: 46, ry: 42, color: '#9B5CFF', opacity: 0.45 },
      { kind: 'blush', cx: 368, cy: 304, rx: 46, ry: 42, color: '#9B5CFF', opacity: 0.45 },
    ]
  if (gear !== 'pirate') return []
  return [
    line('M124 238 Q240 252 336 284 M400 296 Q442 284 478 262', 6, '#1A1A1F'),
    fill(ellipse(368, 306, 36, 40), '#1A1A1F'),
    line('M350 288 Q362 280 378 282', 4, '#FFFFFF', 0.3),
  ]
}

/** Everything drawn on the paddle face, back to front. `gear` adds face pieces from the outfit. */
export function faceShapes(input: Partial<Appearance>, gear?: string): FaceShape[] {
  const a = withDefaults(input)
  INK = isDarkColor(a.bodyColor) && gear !== 'ninja' ? LIGHT_INK : DARK_INK // ninja's slit keeps the body colour visible but its hood is dark: dark ink still reads on the slit
  const brow = BROWS[a.browStyle]
  return [
    ...gearUnder(gear, a.bodyColor),
    ...cheeks(a.cheekStyle),
    ...(brow ? [line(brow, BROW_WIDTH[a.browStyle] ?? 7)] : []),
    ...eyes(a.eyeStyle, a.eyeColor),
    ...mouth(a.mouthStyle),
    ...mark(a.faceMark),
    ...gearFace(gear),
  ]
}

/** Draws the face onto a canvas (for the 3D head). The context should already be in design units. */
export function drawFaceShapes(ctx: CanvasRenderingContext2D, shapes: FaceShape[]) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of shapes) {
    ctx.save()
    if (s.kind === 'blush') {
      ctx.globalAlpha = s.opacity
      ctx.translate(s.cx, s.cy)
      ctx.scale(1, s.ry / s.rx)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s.rx)
      g.addColorStop(0, s.color)
      g.addColorStop(1, s.color + '00')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, s.rx, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const path = new Path2D(s.d)
      if (s.opacity !== undefined) ctx.globalAlpha = s.opacity
      const rule: CanvasFillRule = s.evenodd ? 'evenodd' : 'nonzero'
      if (s.fill) {
        if (typeof s.fill === 'string') ctx.fillStyle = s.fill
        else {
          const g = ctx.createLinearGradient(0, s.fill.y0, 0, s.fill.y1)
          for (const [o, c] of s.fill.stops) g.addColorStop(o, c)
          ctx.fillStyle = g
        }
        ctx.fill(path, rule)
      }
      if (s.stroke) {
        ctx.strokeStyle = s.stroke
        ctx.lineWidth = s.width ?? 1
        ctx.stroke(path)
      }
    }
    ctx.restore()
  }
}

/** The paddle face rectangle (design units), which the 3D face texture covers. */
export const FACE_RECT = { x: 120, y: 80, w: 360, h: 410, r: 150 }

/**
 * Head-fitted shapes. The head is a rounded rectangle (x 120..480, y 80..490, corner radius 150);
 * helmets and hoods follow its outline, grown by `e` so they cover the edge guard too.
 */
export function edgeX(y: number, e = 9) {
  const r = 150 + e
  return y >= 230 ? 120 - e : 270 - Math.sqrt(Math.max(0, r * r - (230 - y) ** 2))
}

/** Upper outline of the (grown) head from the left side at `y` over the top to the right side, as path commands. */
export function headTop(y: number, e = 9) {
  const r = 150 + e
  const l = edgeX(y, e)
  const top = 80 - e
  const left = y > 230 ? `M${l} ${y} L${l} 230 A${r} ${r} 0 0 1 270 ${top}` : `M${l} ${y} A${r} ${r} 0 0 1 270 ${top}`
  const right = y > 230 ? `A${r} ${r} 0 0 1 ${600 - l} 230 L${600 - l} ${y}` : `A${r} ${r} 0 0 1 ${600 - l} ${y}`
  return `${left} L330 ${top} ${right}`
}
