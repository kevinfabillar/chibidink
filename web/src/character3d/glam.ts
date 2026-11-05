import * as THREE from 'three'
import type { Gear, Hair } from '../cosmetics/visuals'
import { FRONT_Z, S, art, fittedCap, gold, quadShape, roundBox, satin, slab, steel, wy } from './gear'
import { mesh, toy } from './materials'

// The Glam outfits (Princess, Fairy, Pop Idol, Sakura) and their hair in 3D, matching
// components/character/glamArt.tsx.

const LONG: [number, number][] = [[150, 170], [70, 330], [104, 600], [150, 646], [200, 606], [250, 634], [300, 604], [350, 634], [400, 606], [450, 646], [496, 600], [530, 330], [450, 170]]
const BOB: [number, number][] = [[300, 56], [90, 56], [92, 260], [88, 404], [142, 456], [118, 412], [122, 380], [300, 380], [478, 380], [482, 412], [458, 456], [512, 404], [508, 260], [510, 56], [300, 56]]
const WING_UP: [number, number][] = [[262, 410], [150, 230], [66, 280], [30, 370], [140, 428]]
const WING_LOW: [number, number][] = [[262, 440], [120, 470], [100, 548], [170, 590], [262, 460]]

const gloss = (color: string) => toy(color, 0.32, 0.7)
const shine = (color: string, intensity = 0.35) => new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.25, clearcoat: 1 })

/** Hair: a fitted cap of bangs over the head, side locks, and the style's back piece. */
export function buildHair(hair: Hair): THREE.Group {
  const g = new THREE.Group()
  const m = toy(hair.color, 0.35, 0.6)
  g.add(fittedCap(196, m, 0.03, 0.05))
  // Soft scalloped fringe along the front edge of the bangs.
  for (const x of [-0.46, -0.23, 0, 0.23, 0.46]) {
    const tuft = mesh(new THREE.SphereGeometry(0.11, 24, 16), m, [x, wy(204), FRONT_Z + 0.02])
    tuft.scale.set(1, 0.5, 0.3)
    g.add(tuft)
  }
  for (const side of [-1, 1]) {
    const lock = mesh(new THREE.CapsuleGeometry(0.055, 0.22, 6, 16), m, [side * 0.63, wy(252), FRONT_Z - 0.03])
    lock.scale.z = 0.6
    g.add(lock)
  }
  switch (hair.style) {
    case 'long':
      g.add(mesh(slab(quadShape(LONG), 0.06, 0.025), m, [0, 0, -0.2]))
      break
    case 'bob':
      g.add(mesh(slab(quadShape(BOB), 0.08, 0.03), m, [0, 0, -0.19]))
      break
    case 'pigtails':
      for (const side of [-1, 1]) {
        const tail = mesh(new THREE.SphereGeometry(1, 32, 24), m, [side * 0.86, wy(330), -0.02])
        tail.scale.set(0.13, 0.32, 0.13)
        tail.rotation.z = side * 0.3
        g.add(tail, mesh(new THREE.SphereGeometry(0.055, 20, 14), gloss(hair.accent ?? '#FF5CA8'), [side * 0.7, wy(206), 0]))
      }
      break
    case 'bun': {
      const bun = mesh(new THREE.SphereGeometry(0.22, 40, 28), m, [0, wy(48), -0.03])
      bun.scale.z = 0.75
      g.add(bun)
      break
    }
  }
  return g
}

/** A five-petal flower facing +z, `r` across. */
function flower(color: string, r: number, center = '#FDE047') {
  const g = new THREE.Group()
  const petal = gloss(color)
  for (let i = 0; i < 5; i++) {
    const t = (i / 5) * Math.PI * 2
    const p = mesh(new THREE.SphereGeometry(r * 0.55, 16, 12), petal, [Math.sin(t) * r * 0.6, Math.cos(t) * r * 0.6, 0])
    p.scale.z = 0.45
    g.add(p)
  }
  g.add(mesh(new THREE.SphereGeometry(r * 0.35, 16, 12), gloss(center), [0, 0, r * 0.12]))
  return g
}

function heartShape(s: number) {
  const h = new THREE.Shape()
  h.moveTo(0, -0.9 * s)
  h.bezierCurveTo(-1.5 * s, 0.1 * s, -0.75 * s, 1.15 * s, 0, 0.42 * s)
  h.bezierCurveTo(0.75 * s, 1.15 * s, 1.5 * s, 0.1 * s, 0, -0.9 * s)
  return h
}

export function glamHat(gear: Gear): THREE.Group | null {
  const g = new THREE.Group()
  switch (gear) {
    case 'princess': {
      const at = (x: number, y: number): [number, number] => [(x - 300) * S, (112 - y) * S]
      const pts: [number, number][] = [[214, 112], [234, 66], [262, 96], [300, 36], [338, 96], [366, 66], [386, 112]]
      const t = new THREE.Shape()
      t.moveTo(...at(...pts[0]))
      for (const p of pts.slice(1)) t.lineTo(...at(...p))
      t.quadraticCurveTo(...at(300, 96), ...at(214, 112))
      const tiara = new THREE.Group()
      tiara.add(mesh(slab(t, 0.02, 0.008), gold()))
      tiara.add(mesh(new THREE.SphereGeometry(0.04, 20, 14), shine('#FF5CA8'), [0, (112 - 72) * S, 0.03]))
      for (const x of [-62, 62]) tiara.add(mesh(new THREE.SphereGeometry(0.024, 16, 12), shine('#7FD3F7'), [x * S, (112 - 88) * S, 0.025]))
      tiara.position.set(0, wy(112), FRONT_Z + 0.06)
      tiara.rotation.x = -0.15
      g.add(tiara)
      return g
    }
    case 'fairy': {
      const spots: [number, number, string][] = [[150, 190, '#FFB3C7'], [178, 132, '#FFFFFF'], [224, 94, '#C9A7F0'], [280, 78, '#FFB3C7'], [336, 80, '#FFFFFF'], [390, 98, '#C9A7F0'], [432, 134, '#FFB3C7'], [454, 192, '#FFFFFF']]
      for (const [x, y, c] of spots) {
        const f = flower(c, 0.075)
        f.position.set(...art(x, y), FRONT_Z + 0.05)
        g.add(f)
      }
      return g
    }
    case 'idol': {
      const bow = new THREE.Group()
      const pink = gloss('#FF5CA8')
      for (const side of [-1, 1]) {
        const loop = mesh(new THREE.SphereGeometry(1, 28, 20), pink, [side * 0.12, 0.01, 0])
        loop.scale.set(0.12, 0.08, 0.05)
        loop.rotation.z = side * 0.35
        bow.add(loop)
      }
      bow.add(mesh(new THREE.SphereGeometry(0.05, 20, 14), gloss('#FF8CC6'), [0, 0, 0.03]))
      bow.position.set(...art(390, 96), FRONT_Z + 0.06)
      g.add(bow)
      return g
    }
    case 'sakura': {
      const y = wy(50)
      const stick = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 12), satin('#8E1B2B'), [0, y, 0.04])
      stick.rotation.z = 1.25
      const pin = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.56, 12), gold(), [0, y, 0.06])
      pin.rotation.z = -1.3
      const f = flower('#FFB3C7', 0.08)
      f.position.set(...art(214, 96), 0.14)
      g.add(stick, pin, f)
      for (const [x, yy] of [[200, 172], [228, 160]]) g.add(mesh(new THREE.SphereGeometry(0.022, 14, 10), gloss('#FF8CB0'), [...art(x, yy), 0.16]))
      return g
    }
    default:
      return null
  }
}

/** The item in the raised hand (hand at the origin, +y up the item) and where its effect glows: [y, w, h]. */
export function glamHeld(gear: Gear): { group: THREE.Group; glowAt: [number, number, number] } | null {
  const g = new THREE.Group()
  const local = (y: number) => (294 - y) * S
  switch (gear) {
    case 'princess':
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 170 * S, 20), gold(), [0, local(235), 0]))
      g.add(mesh(slab(heartShape(30 * S), 0.03, 0.012), shine('#FF5CA8'), [0, local(116), 0]))
      return { group: g, glowAt: [local(116), 0.3, 0.3] }
    case 'fairy': {
      g.add(mesh(new THREE.CylinderGeometry(0.019, 0.019, 170 * S, 20), satin('#4E9F5E'), [0, local(235), 0]))
      const f = flower('#FFB3C7', 0.12)
      f.position.y = local(116)
      g.add(f)
      return { group: g, glowAt: [local(116), 0.32, 0.32] }
    }
    case 'idol':
      g.add(mesh(new THREE.CylinderGeometry(0.032, 0.026, 130 * S, 20), satin('#2E333E'), [0, local(261), 0]))
      g.add(mesh(new THREE.CylinderGeometry(0.044, 0.044, 14 * S, 20), gloss('#FF5CA8'), [0, local(197), 0]))
      g.add(mesh(new THREE.SphereGeometry(26 * S, 24, 18), steel(), [0, local(172), 0]))
      return { group: g, glowAt: [local(172), 0.25, 0.25] }
    case 'sakura': {
      const fan = new THREE.Shape()
      fan.moveTo(0, 0)
      fan.absarc(0, 0, 92 * S, Math.PI / 6, (Math.PI * 5) / 6, false)
      fan.closePath()
      const m = toy('#F4A6C0', 0.4, 0.4)
      m.side = THREE.DoubleSide
      g.add(mesh(slab(fan, 0.008, 0.006), m, [0, local(262), 0]))
      const f = flower('#FFFFFF', 0.05, '#F7C6D6')
      f.position.set(17 * S, local(204), 0.02)
      g.add(f)
      return { group: g, glowAt: [local(210), 0.5, 0.3] }
    }
    default:
      return null
  }
}

/** Fairy wings, behind the body. */
export function glamBack(gear: Gear): THREE.Group | null {
  if (gear !== 'fairy') return null
  const g = new THREE.Group()
  const m = new THREE.MeshPhysicalMaterial({ color: '#A9EFE3', emissive: '#4FBFAE', emissiveIntensity: 0.15, transparent: true, opacity: 0.7, roughness: 0.2, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false })
  for (const side of [1, -1]) {
    const w = new THREE.Group()
    w.add(new THREE.Mesh(slab(quadShape(WING_UP), 0.006, 0.006), m), new THREE.Mesh(slab(quadShape(WING_LOW), 0.006, 0.006), m))
    w.scale.x = side
    w.position.z = -0.28
    w.rotation.y = side * 0.3
    g.add(w)
  }
  return g
}

/** Skirts, gown and kimono around the handle (radius `r`). */
export function glamBody(gear: Gear, r: number, g: THREE.Group) {
  const ring = (radius: number, tube: number, material: THREE.Material, y: number) => {
    const t = mesh(new THREE.TorusGeometry(radius, tube, 12, 64), material, [0, y, 0])
    t.rotation.x = Math.PI / 2
    return t
  }
  switch (gear) {
    case 'princess':
      g.add(mesh(new THREE.CylinderGeometry(r + 0.03, 0.42, (664 - 512) * S, 48), satin('#F59AC7'), [0, wy(588), 0]))
      g.add(ring(0.42, 0.025, satin('#FFE3F0'), wy(664)))
      g.add(mesh(new THREE.CylinderGeometry(r + 0.035, r + 0.035, 16 * S, 24), gold(), [0, wy(514), 0]))
      break
    case 'fairy':
      g.add(mesh(new THREE.CylinderGeometry(r + 0.02, 0.26, (590 - 512) * S, 10), satin('#6CC487'), [0, wy(551), 0]))
      break
    case 'idol':
      g.add(mesh(new THREE.CylinderGeometry(r + 0.02, 0.3, (600 - 512) * S, 24), satin('#B66CF2'), [0, wy(556), 0]))
      g.add(ring(0.3, 0.018, satin('#FFFFFF'), wy(600)))
      break
    case 'sakura':
      g.add(mesh(new THREE.CylinderGeometry(r + 0.04, r + 0.12, (690 - 512) * S, 32), satin('#F4A6C0'), [0, wy(601), 0]))
      g.add(mesh(new THREE.CylinderGeometry(r + 0.06, r + 0.06, 42 * S, 32), satin('#C2334D'), [0, wy(537), 0]))
      g.add(mesh(roundBox(0.26, 0.14, 0.06), satin('#8E1B2B'), [0, wy(537), -(r + 0.08)]))
      break
  }
}
