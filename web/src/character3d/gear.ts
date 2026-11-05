import * as THREE from 'three'
import type { EffectVisual, Gear } from '../cosmetics/visuals'
import { addEffect, type EffectUpdate } from './effects'
import { mesh, toy } from './materials'
import { flameTexture, glowTexture } from './textures'
import { glamBack, glamBody, glamHat, glamHeld } from './glam'

// Themed gear in 3D, matching components/character/gearArt.tsx. World units: the character is
// about 2.8 tall with its feet on y = 0; S converts the 2D artwork's units.

export const S = 0.0037
export const wy = (y: number) => (748 - y) * S

/** Head box (shared with build.ts). */
export const HEAD = { w: 360 * S, h: 410 * S, r: 150 * S, y: wy(285), depth: 0.26, bevel: 0.04 }
export const FRONT_Z = HEAD.depth / 2 + HEAD.bevel

export const steel = () => new THREE.MeshPhysicalMaterial({ color: '#C9D1DC', metalness: 0.85, roughness: 0.25 })
export const gold = () => new THREE.MeshPhysicalMaterial({ color: '#D9AE4A', metalness: 0.9, roughness: 0.3 })
const blade = () => new THREE.MeshPhysicalMaterial({ color: '#E4EAF2', metalness: 0.9, roughness: 0.18 })
/** Soft-gloss finish for cloth, leather and wood, so gear reads as smooth like the gold pieces. */
export const satin = (color: string) => toy(color, 0.36, 0.6)
const dark = (color = '#1A1D24') => satin(color)

/** A box with rounded edges (sharp boxes look low-poly next to the round body). */
export function roundBox(w: number, h: number, d: number) {
  const b = Math.min(w, h, d) * 0.35
  const geo = new THREE.ExtrudeGeometry(roundedRect(w - b * 2, h - b * 2, Math.max(0.001, (Math.min(w, h) / 2 - b) * 0.6)), {
    depth: Math.max(0.0005, d - b * 2),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 4,
    curveSegments: 10,
  })
  geo.translate(0, 0, -Math.max(0.0005, d - b * 2) / 2)
  return geo
}

/** A flat shape extruded with soft bevelled edges, centred on z. */
export function slab(shape: THREE.Shape, depth: number, bevel = 0.012) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24 })
  geo.translate(0, 0, -depth / 2)
  return geo
}

/** A round hat turned from a side profile ([radius, height] points), squashed to sit on the flat head. */
function lathe(points: [number, number][], material: THREE.Material, y: number, depth: number) {
  const geo = new THREE.LatheGeometry(points.map(([r, h]) => new THREE.Vector2(r, h)), 64)
  ;(material as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide
  const m = mesh(geo, material, [0, y, 0])
  m.scale.z = depth
  return m
}

/** An elliptical disc or cylinder, squashed front-to-back to sit on the flat head. */
function oval(rTop: number, rBottom: number, h: number, material: THREE.Material, y: number, depth = 0.55, segments = 32) {
  const m = mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material, [0, y, 0])
  m.scale.z = depth
  return m
}

export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/**
 * A helmet or hood shaped like the head itself: the head's rounded outline above design height
 * `cutY`, grown by `grow` and given full depth, so it hugs the paddle head instead of floating on it.
 */
export function fittedCap(cutY: number, material: THREE.Material, grow = 0.035, depthGrow = 0.05) {
  const w = HEAD.w + grow * 2
  const h = HEAD.h + grow * 2
  const outline = roundedRect(w, h, HEAD.r + grow).getSpacedPoints(240)
  const cut = wy(cutY) - HEAD.y
  // Keep the part of the outline above the cut (clip the polygon against y >= cut).
  const kept: THREE.Vector2[] = []
  for (let i = 0; i < outline.length - 1; i++) {
    const a = outline[i]
    const b = outline[i + 1]
    if (a.y >= cut) kept.push(a)
    if (a.y >= cut !== b.y >= cut) kept.push(new THREE.Vector2(a.x + ((cut - a.y) / (b.y - a.y)) * (b.x - a.x), cut))
  }
  const shape = new THREE.Shape(kept)
  const depth = HEAD.depth + depthGrow * 2
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 6, curveSegments: 12 })
  geo.translate(0, HEAD.y, -depth / 2)
  return new THREE.Mesh(geo, material)
}

/** A tapered, curved horn along `curve`, `base` thick at the root and pointed at the tip. */
function taperedHorn(curve: THREE.Curve<THREE.Vector3>, base: number, material: THREE.Material) {
  const tubular = 32
  const radial = 16
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const centre = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    const k = Math.floor(i / (radial + 1)) / tubular
    curve.getPoint(Math.min(1, k), centre)
    const d = new THREE.Vector3().fromBufferAttribute(pos, i).sub(centre)
    d.multiplyScalar((base * (1 - k) + 0.006) / Math.max(d.length(), 1e-6))
    pos.setXYZ(i, centre.x + d.x, centre.y + d.y, centre.z + d.z)
  }
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, material)
}

/** A band wrapped around the head at design height `y`. */
function headband(color: string, y: number) {
  const w = 1.3
  const d = HEAD.depth + HEAD.bevel * 2 + 0.03
  const ring = roundedRect(w, d, 0.12)
  ring.holes.push(roundedRect(w - 0.04, d - 0.04, 0.1))
  const band = mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 24 }), satin(color))
  band.rotation.x = Math.PI / 2
  band.position.y = wy(y) + 0.07
  return { band, frontZ: d / 2 }
}

/** Maps a 2D artwork point to world x, y (the paddle character's coordinates). */
export const art = (x: number, y: number): [number, number] => [(x - 300) * S, wy(y)]

/** A shape from a 2D path of "M x y" then repeated "Q cx cy x y" segments. */
export function quadShape(points: [number, number][]) {
  const sh = new THREE.Shape()
  sh.moveTo(...art(...points[0]))
  for (let i = 1; i < points.length; i += 2) sh.quadraticCurveTo(...art(...points[i]), ...art(...points[i + 1]))
  sh.closePath()
  return sh
}

const ANGEL_WING: [number, number][] = [[232, 400], [150, 300], [40, 318], [80, 344], [70, 372], [24, 384], [14, 428], [72, 430], [84, 458], [58, 486], [70, 512], [160, 500], [240, 450]]
const DEVIL_WING: [number, number][] = [[232, 392], [150, 300], [44, 280], [72, 322], [62, 352], [30, 354], [22, 394], [60, 398], [72, 428], [50, 450], [62, 474], [150, 456], [240, 432]]

/** Animated extras for premium skins (call `update(t)` from the character's loop). */
export interface Premium3D {
  group: THREE.Group
  update: (t: number) => void
}

function glowSprite(color: string, opacity: number, w: number, h: number, at: [number, number, number], map = glowTexture()) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  s.scale.set(w, h, 1)
  s.position.set(...at)
  return s
}

const ember = (color: string, intensity = 0.8) => new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.3, clearcoat: 1 })

/** Premium backdrop: a big soft glow, twinkling sparkles, and the dragon's wings and flames or the reaper's wisps. */
export function buildPremium(gear: Gear, aura: string, sparkle: string): Premium3D {
  const g = new THREE.Group()
  const steps: ((t: number) => void)[] = []
  const back = glowSprite(aura, 0.45, 3.0, 3.4, [0, 1.45, -0.6])
  g.add(back)
  steps.push((t) => (back.material.opacity = 0.38 + 0.1 * Math.sin(t * 2)))
  const spots: [number, number, number][] = [[-1.0, 2.4, 0.1], [1.05, 1.25, 0], [-1.15, 0.55, 0.1], [0.95, 0.35, 0], [-1.25, 1.6, -0.1], [0.6, 2.9, -0.1]]
  spots.forEach((at, i) => {
    const s = glowSprite(sparkle, 1, 0.16, 0.16, at)
    g.add(s)
    steps.push((t) => {
      const k = 0.5 + 0.5 * Math.sin(t * 2.8 + i * 1.3)
      s.material.opacity = 0.15 + 0.85 * k
      s.scale.setScalar(0.08 + 0.12 * k)
    })
  })

  if (gear === 'dragon') {
    // Same wing as 2D: membrane, bones and claws, beating gently from the shoulder.
    const outline: [number, number][] = [[200, 330], [150, 230], [70, 170], [40, 150], [10, 130], [36, 196], [-10, 250], [40, 290], [20, 350], [72, 372], [90, 420], [140, 412], [190, 430]]
    const membrane = new THREE.MeshPhysicalMaterial({ color: '#E8642C', emissive: '#8A1A10', emissiveIntensity: 0.55, roughness: 0.5, clearcoat: 0.4, transparent: true, opacity: 0.93, side: THREE.DoubleSide })
    const bone = satin('#4A1410')
    const claw = toy('#F2E6C8', 0.35, 0.6)
    const v = (x: number, y: number, z = 0.016) => new THREE.Vector3(...art(x, y), z)
    const [sx, sy] = art(200, 330)
    const wingGeo = slab(quadShape(outline), 0.008, 0.01)
    const bones: [THREE.Curve<THREE.Vector3>, number][] = [
      [new THREE.QuadraticBezierCurve3(v(200, 330), v(150, 230), v(70, 170)), 0.026],
      [new THREE.LineCurve3(v(70, 170), v(10, 130)), 0.014],
      [new THREE.QuadraticBezierCurve3(v(70, 170), v(30, 210), v(-10, 250)), 0.013],
      [new THREE.QuadraticBezierCurve3(v(70, 170), v(50, 270), v(20, 350)), 0.012],
      [new THREE.QuadraticBezierCurve3(v(70, 170), v(86, 300), v(90, 420)), 0.011],
    ]
    for (const side of [1, -1]) {
      const mirror = new THREE.Group()
      mirror.scale.x = side
      const pivot = new THREE.Group()
      pivot.position.set(sx, sy, -0.3)
      const wing = new THREE.Group()
      wing.position.set(-sx, -sy, 0)
      wing.add(new THREE.Mesh(wingGeo, membrane))
      for (const [curve, r] of bones) wing.add(mesh(new THREE.TubeGeometry(curve, 32, r, 10, false), bone))
      const wristClaw = mesh(new THREE.ConeGeometry(0.03, 0.12, 16), claw, [...art(66, 146), 0.016])
      wristClaw.rotation.z = 0.35
      wing.add(wristClaw, glowSprite('#FF7A3C', 0.35, 0.9, 0.9, [...art(70, 260), -0.02]))
      pivot.add(wing)
      mirror.add(pivot)
      g.add(mirror)
      steps.push((t) => (pivot.rotation.y = 0.35 + 0.14 * Math.sin(t * 2.6)))
    }
    const tex = flameTexture()
    for (const [x, i] of [[-0.3, 0], [0.3, 1], [-0.18, 2], [0.18, 3]] as const) {
      const f = glowSprite(i % 2 ? '#FFB347' : '#FF7A3C', 0.9, 0.3, 0.42, [x, 0.2, 0.15], tex)
      g.add(f)
      steps.push((t) => {
        const k = 0.85 + 0.25 * Math.sin(t * 11 + i * 1.9)
        f.scale.set(0.3, 0.42 * k, 1)
        f.position.y = 0.2 + (k - 1) * 0.12
      })
    }
  }

  if (gear === 'void') {
    // Dark smoke drifting up around the reaper, and mist pooling at its feet.
    const smokeTex = glowTexture()
    const smoke = (at: [number, number, number], size: number, opacity: number, color = '#0A0612') => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ color, map: smokeTex, transparent: true, opacity, depthWrite: false }))
      s.scale.set(size, size, 1)
      s.position.set(...at)
      return s
    }
    g.add(smoke([0, 1.4, -0.7], 3.6, 0.75))
    const puffs: { s: THREE.Sprite; x: number; y: number; z: number; speed: number }[] = []
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      const p = { x: Math.cos(a) * 1.0, y: Math.random() * 2.6, z: Math.sin(a) * 0.6 - 0.2, speed: 0.15 + Math.random() * 0.15 }
      const s = smoke([p.x, p.y, p.z], 0.9, 0.7, i % 3 ? '#0A0612' : '#1E1036')
      g.add(s)
      puffs.push({ s, ...p })
    }
    g.add(smoke([0, 0.08, 0.1], 2.4, 0.85, '#120A20'), glowSprite('#5B24A8', 0.35, 2.0, 0.5, [0, 0.06, 0.12]))
    steps.push((t) => {
      for (const p of puffs) {
        const y = (p.y + t * p.speed) % 2.8
        p.s.position.set(p.x + Math.sin(t * 0.6 + p.y) * 0.08, y, p.z)
        p.s.material.opacity = 0.7 * Math.sin((y / 2.8) * Math.PI)
        p.s.scale.setScalar(0.7 + (y / 2.8) * 0.6)
      }
    })
    const orbit = new THREE.Group()
    orbit.position.y = 1.2
    for (let i = 0; i < 3; i++) {
      const t = (i / 3) * Math.PI * 2
      const wisp = glowSprite('#B48CFF', 0.85, 0.3, 0.3, [Math.cos(t) * 1.1, Math.sin(t * 2) * 0.6, Math.sin(t) * 1.1])
      wisp.add(glowSprite('#E9DDFF', 1, 0.35, 0.35, [0, 0, 0]))
      orbit.add(wisp)
    }
    g.add(orbit)
    steps.push((t) => (orbit.rotation.y = t * 0.45))
    for (const [x, y] of [[196, 600], [404, 620]]) {
      const rune = glowSprite('#B48CFF', 0.9, 0.12, 0.12, [(x - 300) * S, wy(y), 0.05])
      g.add(rune)
      steps.push((t) => (rune.material.opacity = 0.6 + 0.4 * Math.sin(t * 3 + x)))
    }
  }
  return { group: g, update: (t) => steps.forEach((s) => s(t)) }
}

/** Wings and tails behind the body (angel and devil). */
export function buildBack(gear: Gear): THREE.Group | null {
  if (gear === 'fairy') return glamBack(gear)
  if (gear !== 'angel' && gear !== 'devil') return null
  const g = new THREE.Group()
  const angel = gear === 'angel'
  const geo = slab(quadShape(angel ? ANGEL_WING : DEVIL_WING), 0.012, 0.014)
  const m = angel ? toy('#F4F6F9', 0.35, 0.7) : satin('#7A1F24')
  m.side = THREE.DoubleSide
  for (const side of [1, -1]) {
    const w = new THREE.Group()
    w.add(new THREE.Mesh(geo, m))
    w.scale.x = side
    w.position.z = -0.3
    w.rotation.y = side * 0.25
    g.add(w)
  }
  if (!angel) {
    const pts = [[320, 610], [400, 640], [436, 572], [446, 516], [488, 520]].map(([x, y], i) => new THREE.Vector3(...art(x, y), -0.12 - i * 0.02))
    const red = satin('#C0252E')
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.02, 12, false), red))
    const tip = new THREE.Shape()
    tip.moveTo(...art(478, 496))
    tip.lineTo(...art(520, 520))
    tip.lineTo(...art(478, 544))
    tip.quadraticCurveTo(...art(490, 520), ...art(478, 496))
    g.add(mesh(slab(tip, 0.01, 0.01), red, [0, 0, -0.2]))
  }
  return g
}

export function buildHat(gear: Gear): THREE.Group | null {
  const glam = glamHat(gear)
  if (glam) return glam
  const g = new THREE.Group()
  const top = HEAD.y + HEAD.h / 2
  switch (gear) {
    case 'knight': {
      const y = wy(214)
      const rx = 0.71
      const ry = 0.62
      const rz = 0.3
      const dome = fittedCap(214, steel())
      // A rounded band (a squashed torus) instead of a flat strip.
      const band = mesh(new THREE.TorusGeometry(1, 0.045, 24, 128), gold(), [0, y - 0.025, 0])
      band.rotation.x = Math.PI / 2
      band.scale.set(rx + 0.01, rz + 0.01, 0.75)
      const crest = mesh(new THREE.TorusGeometry(1, 0.04, 20, 96, Math.PI), gold(), [0, y, 0])
      crest.scale.set(rz + 0.005, ry + 0.005, 1)
      crest.rotation.y = Math.PI / 2
      const plume = mesh(new THREE.SphereGeometry(0.17, 40, 28), toy('#D93A45', 0.4, 0.5), [0, y + ry - 0.06, -0.12])
      plume.scale.set(0.45, 0.75, 1.4)
      plume.rotation.x = -0.6
      g.add(dome, band, crest, plume)
      for (const t of [-0.9, -0.35, 0.35, 0.9])
        g.add(mesh(new THREE.SphereGeometry(0.018, 16, 12), gold(), [Math.sin(t) * (rx + 0.01), y - 0.03, Math.cos(t) * (rz + 0.01)]))
      return g
    }
    case 'wizard': {
      const y = wy(140)
      g.add(fittedCap(140, satin('#4C3A9E')))
      const hat = lathe(
        [[0.8, -0.02], [0.78, 0.01], [0.6, 0.03], [0.52, 0.1], [0.42, 0.3], [0.3, 0.55], [0.19, 0.8], [0.09, 1.04], [0.02, 1.2], [0, 1.22]],
        satin('#4C3A9E'),
        y,
        0.62,
      )
      hat.rotation.z = -0.1
      g.add(hat, oval(0.47, 0.47, 0.07, gold(), y + 0.07, 0.57, 48))
      for (const [x, yy] of [[-0.1, y + 0.35], [0.12, y + 0.7]]) g.add(mesh(new THREE.SphereGeometry(0.035, 16, 12), toy('#FDE047', 0.3, 0.5), [x, yy, 0.17]))
      return g
    }
    case 'pirate': {
      // A smooth bicorne: a rounded crown, with the curved brim from the 2D hat on front and back.
      const crown = fittedCap(192, dark('#22232B'))
      g.add(crown)
      const brimShape = (k: number) => {
        // 2D path M100 202 Q120 132 196 170 Q300 116 404 170 Q480 132 500 202 Q300 172 100 202 Z, centred on (300, 170)
        const at = (x: number, yy: number): [number, number] => [(x - 300) * S * k, (170 - yy) * S * k]
        const sh = new THREE.Shape()
        sh.moveTo(...at(100, 202))
        sh.quadraticCurveTo(...at(120, 132), ...at(196, 170))
        sh.quadraticCurveTo(...at(300, 116), ...at(404, 170))
        sh.quadraticCurveTo(...at(480, 132), ...at(500, 202))
        sh.quadraticCurveTo(...at(300, 172), ...at(100, 202))
        return sh
      }
      for (const side of [1, -1]) {
        const brim = mesh(slab(brimShape(1), 0.02, 0.014), dark('#2E3038'), [0, wy(170), side * 0.3])
        const trim = mesh(slab(brimShape(1.035), 0.01, 0.01), gold(), [0, wy(170) - 0.004, side * 0.288])
        brim.rotation.x = trim.rotation.x = side * -0.18
        g.add(trim, brim)
      }
      const skull = mesh(new THREE.SphereGeometry(18 * S, 24, 16), toy('#F4F6F9', 0.4, 0.4), [0, wy(146), 0.33])
      skull.scale.z = 0.35
      g.add(skull)
      for (const [x, yy] of [[294, 142], [306, 144], [300, 154]])
        g.add(mesh(new THREE.SphereGeometry(3 * S, 10, 8), dark('#22232B'), [(x - 300) * S, wy(yy), 0.355]))
      return g
    }
    case 'cowboy': {
      const y = wy(128)
      g.add(lathe([[0.86, 0.1], [0.82, 0.04], [0.7, 0.0], [0.5, -0.005], [0.38, 0.02], [0.37, 0.2], [0.34, 0.34], [0.24, 0.4], [0.1, 0.37], [0, 0.39]], satin('#8B5A2B'), y + 0.12, 0.58))
      g.add(fittedCap(128, satin('#8B5A2B')))
      g.add(oval(0.375, 0.375, 0.07, dark('#4A2E17'), y + 0.06, 0.63))
      return g
    }
    case 'ninja': {
      const { band, frontZ } = headband('#2A3046', 203)
      g.add(band)
      g.add(mesh(roundBox(76 * S, 34 * S, 0.02), steel(), [0, wy(183), frontZ + 0.012]))
      g.add(mesh(new THREE.TorusGeometry(9 * S, 0.006, 10, 32), dark('#3C4452'), [0, wy(183), frontZ + 0.024]))
      for (const [rz, len] of [[-0.35, 0.36], [-0.8, 0.3]]) {
        const tail = mesh(roundBox(len, 0.07, 0.014), dark('#2A3046'), [0.7 + len / 2 - 0.06, wy(206), -0.06])
        tail.rotation.z = rz
        g.add(tail)
      }
      // Red scarf around the neck, with a tail.
      const scarf = mesh(new THREE.TorusGeometry(1, 0.05, 16, 64), satin('#C23B3B'), [0, wy(486), 0])
      scarf.rotation.x = Math.PI / 2
      scarf.scale.set(0.22, 0.17, 1)
      const tail = mesh(new THREE.CapsuleGeometry(0.03, 0.2, 6, 12), satin('#A02C2E'), [-0.2, wy(508), 0.12])
      tail.rotation.z = -1.1
      g.add(scarf, tail)
      return g
    }
    case 'chef': {
      const white = () => satin('#FFFFFF')
      g.add(fittedCap(118, white()), oval(0.36, 0.36, 0.2, white(), top + 0.12, 0.62))
      for (const [x, y, r] of [[-0.27, top + 0.3, 0.2], [0.27, top + 0.3, 0.2], [0, top + 0.38, 0.25]]) {
        const puff = mesh(new THREE.SphereGeometry(r, 20, 16), white(), [x, y, 0])
        puff.scale.z = 0.7
        g.add(puff)
      }
      return g
    }
    case 'dragon': {
      const y = wy(214)
      const dome = fittedCap(214, toy('#2A2230', 0.25, 0.9))
      const band = mesh(new THREE.TorusGeometry(1, 0.045, 24, 128), ember('#FF7A3C', 0.9), [0, y - 0.025, 0])
      band.rotation.x = Math.PI / 2
      band.scale.set(0.72, 0.31, 0.75)
      g.add(dome, band)
      // Spikes along the crest, front to back.
      for (let i = -3; i <= 3; i++) {
        const a = (i / 3.5) * (Math.PI / 2)
        const spike = mesh(new THREE.ConeGeometry(0.05, 0.2 - Math.abs(i) * 0.02, 20), new THREE.MeshPhysicalMaterial({ color: '#E8642C', emissive: '#7A1020', emissiveIntensity: 0.4, roughness: 0.35, clearcoat: 0.6 }), [0, y + Math.cos(a) * 0.62, Math.sin(a) * 0.3])
        spike.rotation.x = a
        g.add(spike)
      }
      // Big curved horns sweeping out and up, with glowing ember tips.
      for (const side of [-1, 1]) {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(side * 0.5, y + 0.2, -0.02),
          new THREE.Vector3(side * 1.02, y + 0.22, -0.06),
          new THREE.Vector3(side * 0.88, y + 0.7, -0.12),
        )
        g.add(taperedHorn(curve, 0.14, toy('#2A2230', 0.25, 0.9)))
        const ring = mesh(new THREE.TorusGeometry(0.12, 0.016, 12, 32), ember('#FF7A3C', 0.9), [side * 0.56, y + 0.2, -0.02])
        ring.rotation.y = Math.PI / 2
        ring.rotation.x = side * 0.3
        const tip = curve.getPoint(0.97)
        g.add(ring, mesh(new THREE.SphereGeometry(0.018, 12, 10), ember('#FFB347', 1), [tip.x, tip.y, tip.z]), glowSprite('#FF7A3C', 0.8, 0.22, 0.22, [tip.x, tip.y, tip.z]))
      }
      const gem = mesh(new THREE.OctahedronGeometry(0.06, 0), ember('#FF5A3C', 0.9), [0, wy(130), 0.31])
      gem.scale.set(1, 0.8, 0.4)
      g.add(gem)
      return g
    }
    case 'void': {
      const y = wy(256)
      const hood = fittedCap(256, toy('#2E1E48', 0.4, 0.5), 0.055, 0.07)
      const tip = mesh(new THREE.ConeGeometry(0.08, 0.3, 24), toy('#2E1E48', 0.4, 0.5), [0.2, top + 0.1, -0.04])
      tip.rotation.z = -0.9
      const trim = mesh(new THREE.TorusGeometry(1, 0.02, 16, 96, Math.PI), ember('#B48CFF', 0.9), [0, y + 0.05, 0.35])
      trim.scale.set(0.6, 0.32, 1)
      const gem = mesh(new THREE.SphereGeometry(0.045, 24, 16), ember('#B48CFF', 1), [0, wy(104), 0.33])
      g.add(hood, tip, trim, gem, glowSprite('#9B5CFF', 0.6, 0.3, 0.3, [0, wy(104), 0.36]))
      return g
    }
    case 'ranger': {
      const y = wy(200)
      const crown = fittedCap(200, satin('#4C7F45'))
      const band = mesh(new THREE.TorusGeometry(1, 0.03, 16, 96), satin('#6B4527'), [0, y + 0.03, 0])
      band.rotation.x = Math.PI / 2
      band.scale.set(0.6, 0.31, 1)
      const peak = mesh(roundBox(0.5, 0.03, 0.2), satin('#3E6A38'), [0.42, y + 0.02, 0.12])
      peak.rotation.z = 0.28
      const feather = mesh(new THREE.SphereGeometry(0.06, 24, 16), satin('#D93A45'), [-0.32, y + 0.3, 0.12])
      feather.scale.set(0.5, 2.6, 0.4)
      feather.rotation.z = 0.35
      g.add(crown, band, peak, feather)
      return g
    }
    case 'viking': {
      const y = wy(212)
      const dome = fittedCap(212, steel())
      const band = mesh(new THREE.TorusGeometry(1, 0.045, 24, 128), satin('#8A5E38'), [0, y - 0.02, 0])
      band.rotation.x = Math.PI / 2
      band.scale.set(0.63, 0.31, 0.75)
      const ridge = mesh(new THREE.TorusGeometry(1, 0.03, 16, 96, Math.PI), satin('#8A5E38'), [0, y, 0])
      ridge.scale.set(0.305, 0.665, 1)
      ridge.rotation.y = Math.PI / 2
      g.add(dome, band, ridge)
      for (const side of [-1, 1]) {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(side * 0.5, y + 0.15, 0),
          new THREE.Vector3(side * 0.85, y + 0.2, 0),
          new THREE.Vector3(side * 0.78, y + 0.55, 0),
        )
        g.add(taperedHorn(curve, 0.075, toy('#F2E6C8', 0.4, 0.5)))
      }
      return g
    }
    case 'cleric': {
      const y = wy(240)
      const hood = fittedCap(240, toy('#F4F1EA', 0.45, 0.4), 0.045, 0.06)
      const trim = mesh(new THREE.TorusGeometry(1, 0.03, 16, 96, Math.PI), gold(), [0, y + 0.06, 0.02])
      trim.scale.set(0.62, 0.36, 1)
      trim.position.z = 0.33
      const cross = new THREE.Group()
      cross.add(mesh(roundBox(0.075, 0.19, 0.02), gold()), mesh(roundBox(0.19, 0.06, 0.02), gold(), [0, 0.02, 0]))
      cross.position.set(0, wy(110), 0.31)
      const halo = mesh(new THREE.TorusGeometry(0.28, 0.022, 16, 96), new THREE.MeshPhysicalMaterial({ color: '#FBE7A1', emissive: '#FBE7A1', emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 }), [0, wy(42), 0])
      halo.rotation.x = Math.PI / 2 - 0.25
      halo.scale.y = 0.8
      g.add(hood, trim, cross, halo)
      return g
    }
    case 'bard': {
      g.add(fittedCap(180, satin('#2E8C89')))
      const beret = mesh(new THREE.SphereGeometry(1, 64, 32), satin('#2E8C89'), [0.05, top + 0.02, 0])
      beret.scale.set(0.62, 0.2, 0.36)
      beret.rotation.z = -0.12
      const band = mesh(new THREE.TorusGeometry(1, 0.03, 16, 96), satin('#174A48'), [0.03, wy(170), 0])
      band.rotation.x = Math.PI / 2
      band.scale.set(0.58, 0.3, 1)
      const feather = mesh(new THREE.SphereGeometry(0.07, 24, 16), toy('#E6C46A', 0.4, 0.5), [0.6, wy(80), -0.05])
      feather.scale.set(0.5, 3.2, 0.35)
      feather.rotation.z = -1.0
      g.add(beret, band, feather)
      return g
    }
    case 'samurai': {
      const y = wy(212)
      const dome = fittedCap(212, toy('#A82634', 0.3, 0.8))
      const rim = mesh(new THREE.TorusGeometry(1, 0.04, 20, 128), satin('#2A1A1E'), [0, y - 0.02, 0])
      rim.rotation.x = Math.PI / 2
      rim.scale.set(0.67, 0.32, 0.8)
      g.add(dome, rim)
      for (const side of [-1, 1]) {
        const flap = mesh(roundBox(0.18, 0.26, 0.03), satin('#5E1522'), [side * 0.72, y - 0.14, 0])
        flap.rotation.z = side * 0.35
        g.add(flap)
      }
      const v = new THREE.Shape()
      const at = (x: number, yy: number): [number, number] => [(x - 300) * S, (124 - yy) * S]
      v.moveTo(...at(300, 124))
      v.quadraticCurveTo(...at(250, 74), ...at(228, 30))
      v.quadraticCurveTo(...at(272, 64), ...at(300, 98))
      v.quadraticCurveTo(...at(328, 64), ...at(372, 30))
      v.quadraticCurveTo(...at(350, 74), ...at(300, 124))
      g.add(mesh(slab(v, 0.012, 0.01), gold(), [0, wy(124), 0.24]))
      const disc = mesh(new THREE.CylinderGeometry(14 * S, 14 * S, 0.02, 32), gold(), [0, wy(150), 0.3])
      disc.rotation.x = Math.PI / 2
      g.add(disc)
      return g
    }
    case 'angel': {
      const halo = mesh(new THREE.TorusGeometry(0.42, 0.035, 20, 96), new THREE.MeshPhysicalMaterial({ color: '#E6C46A', emissive: '#FDE68A', emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.25 }), [0, wy(40), 0])
      halo.rotation.x = Math.PI / 2 - 0.25
      halo.scale.y = 0.8
      const shine = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#FDE68A', map: glowTexture(), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }))
      shine.scale.set(1.2, 0.5, 1)
      shine.position.set(0, wy(40), 0)
      g.add(halo, shine)
      return g
    }
    case 'devil': {
      for (const side of [-1, 1]) {
        const horn = mesh(new THREE.ConeGeometry(0.075, 0.36, 32), satin('#C0252E'), [side * 0.36, top + 0.04, 0])
        horn.rotation.z = -side * 0.42
        g.add(horn)
      }
      return g
    }
    case 'royal': {
      const y = top - 0.06
      const ring = oval(0.4, 0.4, 0.12, gold(), y, 0.6)
      ;(ring.material as THREE.Material).side = THREE.DoubleSide
      g.add(ring)
      for (let i = 0; i < 6; i++) {
        const t = (i / 6) * Math.PI * 2
        g.add(mesh(new THREE.ConeGeometry(0.06, 0.2, 8), gold(), [Math.sin(t) * 0.38, y + 0.15, Math.cos(t) * 0.23]))
        g.add(mesh(new THREE.SphereGeometry(0.028, 16, 12), toy('#FBE7A1', 0.3, 0.6), [Math.sin(t) * 0.38, y + 0.26, Math.cos(t) * 0.23]))
      }
      g.add(mesh(new THREE.SphereGeometry(0.04, 12, 10), toy('#D93A45', 0.2, 0.8), [0, y, 0.25]))
      return g
    }
    default:
      return null
  }
}

/** The item in the raised right hand. Local +y points up the item; the hand is at the origin. */
export function buildHeld(gear: Gear, effect: EffectVisual | null, fx: EffectUpdate[]): THREE.Group {
  const g = new THREE.Group()
  let glowAt: [number, number, number] = [0, 0, 0.08] // [y, width, height] where the effect sits
  switch (gear) {
    case 'knight':
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.207, 24), satin('#3B2A1E')))
      g.add(mesh(new THREE.SphereGeometry(0.033, 12, 10), gold(), [0, -0.104, 0]))
      g.add(mesh(roundBox(0.23, 0.052, 0.05), gold(), [0, 0.137, 0]))
      g.add(mesh(roundBox(0.066, 0.55, 0.016), blade(), [0, 0.44, 0]))
      g.add(tip(0.765))
      glowAt = [0.46, 0.26, 0.85]
      break
    case 'wizard': {
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 24), satin('#6B4527'), [0, -0.28, 0]))
      const orb = new THREE.MeshPhysicalMaterial({ color: '#5EEAD4', emissive: '#14A3A3', emissiveIntensity: 0.6, roughness: 0.1, clearcoat: 1 })
      g.add(mesh(new THREE.SphereGeometry(0.1, 24, 16), orb, [0, 0.6, 0]))
      g.add(mesh(new THREE.TorusGeometry(0.07, 0.012, 12, 32), satin('#8B5A2B'), [0, 0.52, 0]))
      glowAt = [0.6, 0.42, 0.42]
      break
    }
    case 'pirate': {
      // Curved dagger from the 2D path (hand at 539, 294).
      const at = (x: number, yy: number): [number, number] => [(x - 539) * S, (294 - yy) * S]
      const bl = new THREE.Shape()
      bl.moveTo(...at(532, 278))
      bl.quadraticCurveTo(...at(510, 180), ...at(556, 94))
      bl.quadraticCurveTo(...at(552, 182), ...at(550, 278))
      bl.closePath()
      g.add(mesh(slab(bl, 0.006, 0.006), blade()))
      const guard = mesh(new THREE.TorusGeometry(0.07, 0.014, 16, 32, Math.PI * 0.8), gold(), [0, 0.0, 0.01])
      guard.rotation.z = Math.PI * 0.6
      g.add(guard)
      glowAt = [0.33, 0.3, 0.7]
      break
    }
    case 'ninja': {
      // Shuriken (2D: centred at 548, 248, turned 15°).
      const st = new THREE.Shape()
      const pts = [[0, -28], [7, -7], [28, 0], [7, 7], [0, 28], [-7, 7], [-28, 0], [-7, -7]]
      st.moveTo(pts[0][0] * S, pts[0][1] * S)
      for (const [x, y] of pts.slice(1)) st.lineTo(x * S, y * S)
      st.closePath()
      st.holes.push(new THREE.Path().absarc(0, 0, 5 * S, 0, Math.PI * 2, false))
      const star = mesh(slab(st, 0.008, 0.006), steel(), [(548 - 539) * S, (294 - 248) * S, 0.02])
      star.rotation.z = -0.26
      g.add(star)
      glowAt = [(294 - 248) * S, 0.3, 0.3]
      break
    }
    case 'cowboy': {
      const loop = mesh(new THREE.TorusGeometry(0.22, 0.016, 12, 64), satin('#C8A165'), [0, 0.42, 0])
      loop.scale.y = 0.68
      g.add(loop, mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 24), satin('#C8A165'), [0, 0.15, 0]))
      glowAt = [0.42, 0.6, 0.45]
      break
    }
    case 'chef':
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 24), dark('#2E333E'), [0, 0.18, 0]))
      g.add(mesh(roundBox(0.24, 0.36, 0.02), steel(), [0, 0.6, 0]))
      glowAt = [0.6, 0.4, 0.5]
      break
    case 'dragon': {
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.207, 24), dark('#2A1A1E')))
      g.add(mesh(new THREE.SphereGeometry(0.033, 20, 14), ember('#FF5A3C', 0.8), [0, -0.104, 0]))
      g.add(mesh(roundBox(0.29, 0.06, 0.05), toy('#2A2230', 0.25, 0.9), [0, 0.137, 0]))
      g.add(mesh(roundBox(0.066, 0.55, 0.016), ember('#FFB347', 0.9), [0, 0.44, 0]))
      const t = mesh(new THREE.ConeGeometry(0.047, 0.12, 4), ember('#FFB347', 0.9), [0, 0.77, 0])
      t.rotation.y = Math.PI / 4
      t.scale.z = 0.34
      g.add(t, glowSprite('#FF7A3C', 0.8, 0.34, 0.95, [0, 0.46, 0.02], flameTexture()))
      glowAt = [0.46, 0.26, 0.85]
      break
    }
    case 'void': {
      g.add(mesh(new THREE.CylinderGeometry(0.019, 0.019, 1.48, 24), dark('#2A1A30'), [0, -0.05, 0]))
      const at = (x: number, y: number): [number, number] => [(x - 539) * S, (294 - y) * S]
      const blade = new THREE.Shape()
      blade.moveTo(...at(546, 84))
      blade.quadraticCurveTo(...at(498, 14), ...at(396, 32))
      blade.quadraticCurveTo(...at(478, 46), ...at(530, 114))
      blade.closePath()
      g.add(mesh(slab(blade, 0.008, 0.008), steel()))
      g.add(mesh(new THREE.SphereGeometry(0.033, 20, 14), ember('#B48CFF', 1), [0, (294 - 84) * S, 0.01]))
      g.add(glowSprite('#9B5CFF', 0.55, 0.6, 0.35, [(470 - 539) * S, (294 - 50) * S, -0.02]))
      glowAt = [(294 - 64) * S, 0.5, 0.3]
      break
    }
    case 'ranger': {
      // A bow: a curved limb with a straight string, from the 2D path (x 524..571, y 146..442).
      const at = (x: number, y: number) => new THREE.Vector3((x - 539) * S, (294 - y) * S, 0)
      const limb = new THREE.QuadraticBezierCurve3(at(524, 146), at(618, 294), at(524, 442))
      g.add(mesh(new THREE.TubeGeometry(limb, 64, 0.02, 12, false), satin('#6B4527')))
      g.add(mesh(new THREE.TubeGeometry(new THREE.LineCurve3(at(524, 146), at(524, 442)), 4, 0.004, 6, false), toy('#EDE6D6', 0.6, 0)))
      glowAt = [0, 0.3, 0.9]
      break
    }
    case 'viking': {
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.2, 24), satin('#6B4527'), [0, -0.03, 0]))
      const at = (x: number, y: number): [number, number] => [(x - 539) * S, (294 - y) * S]
      const right = new THREE.Shape()
      right.moveTo(...at(545, 150))
      right.quadraticCurveTo(...at(604, 136), ...at(610, 196))
      right.quadraticCurveTo(...at(604, 256), ...at(545, 242))
      right.closePath()
      const left = new THREE.Shape()
      left.moveTo(...at(533, 160))
      left.quadraticCurveTo(...at(508, 170), ...at(506, 196))
      left.quadraticCurveTo(...at(508, 222), ...at(533, 232))
      left.closePath()
      g.add(mesh(slab(right, 0.01, 0.01), steel()), mesh(slab(left, 0.01, 0.01), steel()))
      glowAt = [(294 - 196) * S, 0.4, 0.4]
      break
    }
    case 'cleric': {
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 24), gold(), [0, -0.03, 0]))
      g.add(mesh(new THREE.TorusGeometry(0.09, 0.014, 16, 48), gold(), [0, (294 - 118) * S, 0]))
      const heart = new THREE.Shape()
      const at = (x: number, y: number): [number, number] => [(x - 539) * S, (118 - y) * S]
      heart.moveTo(...at(539, 132))
      heart.bezierCurveTo(...at(520, 120), ...at(523, 102), ...at(539, 111))
      heart.bezierCurveTo(...at(555, 102), ...at(558, 120), ...at(539, 132))
      const pink = new THREE.MeshPhysicalMaterial({ color: '#FF7F96', emissive: '#FF7F96', emissiveIntensity: 0.4, roughness: 0.3, clearcoat: 1 })
      g.add(mesh(slab(heart, 0.012, 0.008), pink, [0, (294 - 118) * S, 0]))
      glowAt = [(294 - 118) * S, 0.34, 0.34]
      break
    }
    case 'samurai':
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.19, 24), dark('#1A1A1F'), [0, -0.06, 0]))
      g.add(mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.02, 32), gold(), [0, 0.09, 0]))
      g.add(mesh(roundBox(0.04, 0.7, 0.01), blade(), [0, 0.45, 0]))
      g.add(tip(0.84, 0.028))
      glowAt = [0.45, 0.22, 0.85]
      break
    case 'angel': {
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.63, 24), gold(), [0, 0.15, 0]))
      const st = new THREE.Shape()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.05 : 0.12
        const t = (i / 10) * Math.PI * 2
        const pt: [number, number] = [Math.sin(t) * r, Math.cos(t) * r]
        if (i === 0) st.moveTo(...pt)
        else st.lineTo(...pt)
      }
      st.closePath()
      const starMat = new THREE.MeshPhysicalMaterial({ color: '#FDE047', emissive: '#FDE047', emissiveIntensity: 0.35, roughness: 0.25, clearcoat: 1 })
      g.add(mesh(slab(st, 0.02, 0.012), starMat, [0, (294 - 128) * S, 0]))
      glowAt = [(294 - 128) * S, 0.36, 0.36]
      break
    }
    case 'devil': {
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.1, 24), dark('#2E333E'), [0, -0.0, 0]))
      const at = (x: number, y: number): [number, number] => [(x - 539) * S, (294 - y) * S]
      const fork = new THREE.Shape()
      const pts: [number, number][] = [[507, 156], [507, 104], [517, 82], [521, 120], [531, 120], [531, 74], [539, 52], [547, 74], [547, 120], [557, 120], [561, 82], [571, 104], [571, 156]]
      fork.moveTo(...at(...pts[0]))
      for (const p of pts.slice(1)) fork.lineTo(...at(...p))
      fork.quadraticCurveTo(...at(539, 176), ...at(507, 156))
      g.add(mesh(slab(fork, 0.014, 0.01), satin('#C0252E')))
      glowAt = [(294 - 110) * S, 0.32, 0.4]
      break
    }
    case 'royal':
      g.add(mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.78, 24), gold(), [0, 0.15, 0]))
      g.add(mesh(new THREE.SphereGeometry(0.085, 20, 16), toy('#D93A45', 0.15, 0.9), [0, 0.6, 0]))
      g.add(mesh(new THREE.TorusGeometry(0.085, 0.014, 8, 24), gold(), [0, 0.6, 0]))
      glowAt = [0.6, 0.36, 0.36]
      break
    default: {
      const glam = glamHeld(gear)
      if (glam) {
        g.add(glam.group)
        glowAt = glam.glowAt
      } else glowAt = [0, 0.32, 0.32]
    }
  }
  if (effect) fx.push(addEffect(g, effect, glowAt[0], Math.max(0.55, Math.max(glowAt[1], glowAt[2]) * 0.8)))
  return g
}

function tip(y: number, w = 0.047) {
  const t = mesh(new THREE.ConeGeometry(w, 0.1, 4), blade(), [0, y, 0])
  t.rotation.y = Math.PI / 4
  t.scale.z = 0.34
  return t
}

/** Things on the back or in the left hand for the newer outfits (quiver, viking shield, lute). */
export function buildExtras(gear: Gear): THREE.Group | null {
  const g = new THREE.Group()
  switch (gear) {
    case 'ranger': {
      const quiver = new THREE.Group()
      quiver.add(mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.6, 32), satin('#7A5230'), [0, -0.24, 0]))
      for (const [x, h] of [[-0.022, 0.18], [0.022, 0.16], [0, 0.2]]) {
        quiver.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, h, 8), toy('#C9B48A', 0.6, 0), [x, 0.04 + h / 2, 0]))
        quiver.add(mesh(new THREE.ConeGeometry(0.022, 0.06, 12), toy('#E9EEF5', 0.5, 0.2), [x, 0.07 + h, 0]))
      }
      quiver.position.set((430 - 300) * S, wy(86), -0.22)
      quiver.rotation.z = -0.42
      g.add(quiver)
      return g
    }
    case 'viking': {
      // Fur collar.
      const fur = mesh(new THREE.TorusGeometry(1, 0.06, 20, 64), toy('#D8C59A', 0.75, 0.05), [0, wy(498), 0])
      fur.rotation.x = Math.PI / 2
      fur.scale.set(0.26, 0.2, 1)
      g.add(fur)
      return g
    }
    case 'void': {
      const chain = mesh(new THREE.TorusGeometry(1, 0.012, 8, 64), steel(), [0, wy(486), 0])
      chain.rotation.x = Math.PI / 2
      chain.scale.set(0.24, 0.2, 1)
      const amulet = mesh(new THREE.OctahedronGeometry(0.05, 0), ember('#B48CFF', 0.9), [0, wy(502), FRONT_Z - 0.03])
      amulet.scale.set(0.9, 1.2, 0.5)
      g.add(chain, amulet, glowSprite('#9B5CFF', 0.6, 0.2, 0.2, [0, wy(502), FRONT_Z]))
      return g
    }
    case 'bard': {
      const collar = mesh(new THREE.ConeGeometry(0.1, 0.12, 24), toy('#E6C46A', 0.35, 0.6), [0, wy(492), FRONT_Z - 0.04])
      collar.rotation.x = Math.PI
      collar.scale.z = 0.4
      g.add(collar)
      return g
    }
    default:
      return null
  }
}

/** Left-hand items: the viking's wooden shield and the bard's lute. Local origin is the hand. */
export function buildOffhand(gear: Gear): THREE.Group | null {
  const g = new THREE.Group()
  if (gear === 'viking') {
    const disc = mesh(new THREE.CylinderGeometry(0.244, 0.244, 0.04, 64), satin('#8A5E38'))
    disc.rotation.x = Math.PI / 2
    const rim = mesh(new THREE.TorusGeometry(0.22, 0.016, 12, 64), steel(), [0, 0, 0.022])
    const boss = mesh(new THREE.SphereGeometry(0.065, 24, 16), steel(), [0, 0, 0.022])
    boss.scale.z = 0.5
    const edge = mesh(new THREE.TorusGeometry(0.244, 0.02, 12, 64), satin('#5A381F'))
    g.add(disc, rim, boss, edge)
    g.position.set(0.04, -0.08, 0.2)
    return g
  }
  if (gear === 'bard') {
    const body = mesh(new THREE.SphereGeometry(1, 48, 32), satin('#B87333'), [0, -0.17, 0])
    body.scale.set(0.17, 0.2, 0.08)
    const hole = mesh(new THREE.CircleGeometry(0.045, 32), dark('#3B2416'), [0, -0.12, 0.082])
    const neck = mesh(roundBox(0.06, 0.42, 0.03), satin('#5A381F'), [0, 0.18, 0])
    const head = mesh(roundBox(0.09, 0.09, 0.035), satin('#5A381F'), [0, 0.42, 0])
    g.add(body, hole, neck, head)
    g.position.set(0, -0.05, 0.14)
    g.rotation.z = 0.49
    return g
  }
  return null
}

/** Knight's shield for the left hand. */
export function buildShield(effect: EffectVisual | null, fx: EffectUpdate[]) {
  const g = new THREE.Group()
  const disc = mesh(new THREE.CylinderGeometry(0.244, 0.244, 0.04, 48), toy('#2B4579', 0.4, 0.5))
  disc.rotation.x = Math.PI / 2
  const rim = mesh(new THREE.TorusGeometry(0.244, 0.026, 10, 48), gold())
  const ring = mesh(new THREE.TorusGeometry(0.185, 0.006, 6, 48), toy('#E6C46A', 0.4, 0.2), [0, 0, 0.022])
  const ball = mesh(new THREE.SphereGeometry(0.096, 24, 16), toy('#D8EE3A', 0.5, 0.3), [0, 0, 0.025])
  ball.scale.z = 0.45
  g.add(disc, rim, ring, ball)
  if (effect) fx.push(addEffect(g, effect, 0, 0.6))
  return g
}

/** Belts, aprons and scarves around the handle (radius `r`). */
export function buildBodyGear(gear: Gear, r: number): THREE.Group {
  const g = new THREE.Group()
  const belt = (color: THREE.Material, buckle: THREE.Material) => {
    g.add(mesh(new THREE.CylinderGeometry(r + 0.022, r + 0.022, 20 * S, 16), color, [0, wy(526), 0]))
    g.add(mesh(roundBox(0.09, 0.11, 0.025), buckle, [0, wy(526), r + 0.03]))
  }
  switch (gear) {
    case 'knight':
      belt(satin('#6B4527'), gold())
      g.add(mesh(roundBox(0.08, 0.096, 0.05), satin('#5A381F'), [r * 0.85, wy(545), r * 0.55]))
      break
    case 'pirate': {
      g.add(mesh(new THREE.CylinderGeometry(r + 0.026, r + 0.026, 24 * S, 24), satin('#B8323F'), [0, wy(526), 0]))
      for (const [rz, len] of [[0.35, 0.2], [-0.05, 0.17]]) {
        const tail = mesh(new THREE.CapsuleGeometry(0.016, len, 6, 12), satin('#9E2B3A'), [r * 0.75, wy(526) - len / 2 - 0.02, r * 0.75])
        tail.rotation.z = rz
        g.add(tail)
      }
      break
    }
    case 'royal':
      belt(gold(), toy('#D93A45', 0.2, 0.8))
      break
    case 'ranger':
      g.add(mesh(new THREE.CylinderGeometry(r + 0.022, r + 0.022, 18 * S, 24), satin('#4A2F1A'), [0, wy(525), 0]))
      g.add(mesh(roundBox(0.08, 0.096, 0.05), satin('#7A5230'), [r * 0.85, wy(543), r * 0.55]))
      break
    case 'wizard':
    case 'angel':
      g.add(mesh(new THREE.CylinderGeometry(r + 0.02, r + 0.02, 0.025, 16), gold(), [0, wy(528), 0]))
      break
    case 'chef':
      g.add(mesh(roundBox(r * 2 + 0.07, 0.45, 0.02), satin('#FFFFFF'), [0, wy(580), r + 0.015]))
      break
    case 'cowboy': {
      const tri = new THREE.Shape()
      tri.moveTo(-0.2, 0.05)
      tri.quadraticCurveTo(0, 0.08, 0.2, 0.05)
      tri.quadraticCurveTo(0.12, -0.12, 0.01, -0.2)
      tri.quadraticCurveTo(0, -0.21, -0.01, -0.2)
      tri.quadraticCurveTo(-0.12, -0.12, -0.2, 0.05)
      const scarf = mesh(slab(tri, 0.02, 0.012), satin('#C0392B'), [0, wy(500), FRONT_Z - 0.05])
      g.add(scarf)
      break
    }
  }
  glamBody(gear, r, g)
  return g
}
