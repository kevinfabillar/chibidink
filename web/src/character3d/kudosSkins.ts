import * as THREE from 'three'
import type { Gear } from '../cosmetics/visuals'
import { FRONT_Z, HEAD, S, art, fittedCap, gold, roundBox, satin, slab, wy } from './gear'
import { mesh, toy } from './materials'
import { glowTexture } from './textures'

// The second wave of achievement skins in 3D, matching components/character/kudosSkinsArt.tsx:
// Jade Sage (Dinks), Starfall Archer (Drops), Volt Striker (Speed-ups), Meteor Titan (Smashes),
// Laurel Olympian (Good sport), Soulbound (Great partner) and Cheer Captain (Fun to play with).

type Step = (t: number) => void

const glossy = (color: string) => toy(color, 0.28, 0.8)
const glowMat = (color: string, intensity = 0.8) =>
  new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.25, clearcoat: 1 })
const silver = () => new THREE.MeshPhysicalMaterial({ color: '#E3E8EF', metalness: 0.95, roughness: 0.14 })
const glass = (color: string, opacity = 0.5) =>
  new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.05, metalness: 0.1, clearcoat: 1, depthWrite: false })
const jade = () => new THREE.MeshPhysicalMaterial({ color: '#10B981', roughness: 0.15, clearcoat: 1, transmission: 0.2, thickness: 0.2 })

/** A flat face-on sprite glow (additive). */
function glow(color: string, opacity: number, w: number, h: number, at: [number, number, number]) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ color, map: glowTexture(), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  s.scale.set(w, h, 1)
  s.position.set(...at)
  return s
}

/** In the raised hand's space: design coordinates (x, y) relative to the hand at 539,294, +y up. */
const hand = (x: number, y: number): [number, number] => [(x - 539) * S, (294 - y) * S]

function starShape(r: number, inner = 0.45) {
  const s = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2
    const rr = i % 2 ? r * inner : r
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  s.closePath()
  return s
}

function heartShape(s: number) {
  const h = new THREE.Shape()
  h.moveTo(0, -s * 0.9)
  h.bezierCurveTo(-s * 1.4, 0, -s * 0.9, s, 0, s * 0.35)
  h.bezierCurveTo(s * 0.9, s, s * 1.4, 0, 0, -s * 0.9)
  return h
}

/** A leaf or feather outline: pointed at both ends, `w` wide and `h` long, growing up from the origin. */
function leafShape(w: number, h: number) {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.quadraticCurveTo(w, h * 0.45, 0, h)
  s.quadraticCurveTo(-w, h * 0.45, 0, 0)
  return s
}

function feather(h: number, material: THREE.Material, vein: THREE.Material) {
  const g = new THREE.Group()
  g.add(mesh(slab(leafShape(h * 0.26, h), 0.008, 0.004), material))
  g.add(mesh(new THREE.CylinderGeometry(0.004, 0.006, h * 1.05, 6), vein, [0, h * 0.48, 0.008]))
  return g
}

function lightningShape(h: number) {
  const s = new THREE.Shape()
  const p: [number, number][] = [[0.02, 0], [-0.06, -h * 0.45], [0.005, -h * 0.45], [-0.045, -h], [0.08, -h * 0.38], [0.016, -h * 0.38], [0.055, 0]]
  s.moveTo(...p[0])
  for (const q of p.slice(1)) s.lineTo(...q)
  s.closePath()
  return s
}

/** A cone bent sideways as it rises: horns. */
function bentCone(radius: number, height: number, bend: number, material: THREE.Material) {
  const geo = new THREE.ConeGeometry(radius, height, 16, 14)
  geo.translate(0, height / 2, 0)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const k = pos.getY(i) / height
    pos.setX(i, pos.getX(i) + bend * k * k)
  }
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, material)
}

/** A ring around the head at height y (in design units). */
function headRing(y: number, tube: number, material: THREE.Material, grow = 0.04) {
  const t = mesh(new THREE.TorusGeometry(1, tube, 12, 64), material, [0, wy(y), 0])
  t.rotation.x = Math.PI / 2
  t.scale.set(HEAD.w / 2 + grow, HEAD.depth / 2 + grow + 0.05, 1)
  return t
}

/** A burst of strands: the cheer captain's pom-poms. */
function pomPom(r: number) {
  const g = new THREE.Group()
  const mats = [toy('#F472B6', 0.3, 0.9), toy('#FFFFFF', 0.3, 0.9), toy('#EC4899', 0.3, 0.9)]
  const strand = new THREE.CylinderGeometry(0.016, 0.03, r, 5)
  strand.translate(0, r / 2, 0)
  const n = 140
  for (let i = 0; i < n; i++) {
    // Even spread over a sphere (golden spiral).
    const y = 1 - (2 * (i + 0.5)) / n
    const rr = Math.sqrt(1 - y * y)
    const a = i * 2.39996
    const dir = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr)
    const m = new THREE.Mesh(strand, mats[i % 3])
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    m.scale.y = 0.8 + ((i * 37) % 10) / 25
    g.add(m)
  }
  g.add(mesh(new THREE.SphereGeometry(r * 0.62, 20, 14), toy('#F9A8D4', 0.4, 0.6)))
  return g
}

function textTexture(text: string, color: string, bg: string) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(4, 4, 248, 120, 30)
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = '#FFFFFF'
  ctx.stroke()
  ctx.fillStyle = color
  ctx.font = '900 76px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 70)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Hats, crowns and what's worn on the face. `fx` collects per-frame updates. */
export function kudosHat(gear: Gear, fx: Step[] = []): THREE.Group | null {
  const g = new THREE.Group()
  switch (gear) {
    case 'sage': {
      g.add(headRing(200, 0.03, gold()), headRing(200, 0.018, jade(), 0.055))
      for (const [x, k] of [[236, 0.8], [300, 1.2], [364, 0.8]] as const) {
        const stone = mesh(new THREE.SphereGeometry(0.04 * k, 20, 14), jade(), [...art(x, 190), FRONT_Z + 0.04])
        stone.scale.set(1.25, 1, 0.6)
        g.add(stone)
      }
      // A lotus crown on top, glowing softly.
      const lotus = new THREE.Group()
      const petal = slab(leafShape(0.08, 0.2), 0.012, 0.006)
      for (const [deg, m] of [[-60, '#A7F3D0'], [-32, '#A7F3D0'], [0, '#ECFDF5'], [32, '#A7F3D0'], [60, '#A7F3D0']] as const) {
        const p = mesh(petal, toy(m, 0.3, 0.8))
        p.rotation.z = (deg * Math.PI) / 180
        lotus.add(p)
      }
      lotus.position.set(...art(300, 58), 0.06)
      lotus.scale.setScalar(1.5)
      lotus.rotation.x = -0.25
      const halo = glow('#6EE7B7', 0.45, 0.6, 0.6, [...art(300, 20), 0.05])
      g.add(lotus, halo)
      fx.push((t) => (halo.material.opacity = 0.3 + 0.2 * Math.sin(t * 2)))
      // A feather tucked in at the side.
      const f = feather(0.48, toy('#D1FAE5', 0.4, 0.5), satin('#059669'))
      f.position.set(...art(420, 196), 0.06)
      f.rotation.z = -0.5
      g.add(f)
      return g
    }
    case 'archer': {
      g.add(headRing(198, 0.024, silver()))
      const wingMat = toy('#E0F2FE', 0.3, 0.8)
      for (const side of [-1, 1]) {
        for (const [len, tilt, y] of [[0.24, 0.55, 196], [0.28, 0.9, 204], [0.22, 1.25, 212]] as const) {
          const fin = mesh(slab(leafShape(0.04, len), 0.008, 0.004), wingMat, [side * (HEAD.w / 2 + 0.04), wy(y), -0.02])
          fin.rotation.z = side * -tilt
          fin.rotation.y = side * -0.5
          g.add(fin)
        }
      }
      // A crescent moon on the brow holding a star gem.
      const moon = new THREE.Shape()
      moon.absarc(0, 0, 0.13, Math.PI * 1.1, Math.PI * 1.9, false)
      moon.absarc(0, 0.05, 0.1, Math.PI * 1.85, Math.PI * 1.15, true)
      g.add(mesh(slab(moon, 0.016, 0.006), silver(), [...art(300, 140), FRONT_Z + 0.04]))
      const gem = mesh(slab(starShape(0.055), 0.02, 0.006), glowMat('#38BDF8', 0.9), [...art(300, 168), FRONT_Z + 0.06])
      const sparkle = glow('#7DD3FC', 0.5, 0.32, 0.32, [...art(300, 168), FRONT_Z + 0.09])
      g.add(gem, sparkle)
      fx.push((t) => {
        gem.rotation.z = Math.sin(t * 1.5) * 0.2
        sparkle.material.opacity = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(t * 3))
      })
      return g
    }
    case 'volt': {
      const black = glossy('#15171C')
      const yellow = glowMat('#FACC15', 0.8)
      // Headphones: a band over the top, big cups at the sides with bolts on them.
      const band = mesh(new THREE.TorusGeometry(HEAD.w / 2 + 0.07, 0.035, 12, 64, Math.PI), black, [0, wy(250), 0])
      band.scale.y = 1.25
      g.add(band)
      for (const side of [-1, 1]) {
        const cup = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 32), black, [side * (HEAD.w / 2 + 0.08), wy(290), 0])
        cup.rotation.z = Math.PI / 2
        const rim = mesh(new THREE.TorusGeometry(0.13, 0.014, 10, 40), yellow, [side * (HEAD.w / 2 + 0.145), wy(290), 0])
        rim.rotation.y = Math.PI / 2
        const b = mesh(slab(lightningShape(0.16), 0.01, 0.003), yellow, [side * (HEAD.w / 2 + 0.15), wy(290) + 0.08, side * 0.03])
        b.rotation.y = (side * Math.PI) / 2
        g.add(cup, rim, b)
      }
      // An antenna with a spark on top.
      const antenna = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8), black, [...art(436, 74), 0])
      antenna.rotation.z = -0.45
      const spark = mesh(new THREE.SphereGeometry(0.04, 16, 12), glowMat('#FDE047', 1.4), [...art(452, 38), 0])
      const sparkGlow = glow('#FACC15', 0.6, 0.3, 0.3, [...art(452, 38), 0])
      g.add(antenna, spark, sparkGlow)
      // A see-through visor over the eyes, its scanline sweeping up and down.
      const visorY = wy(300)
      g.add(mesh(roundBox(HEAD.w - 0.12, 0.28, 0.02), glass('#FACC15', 0.3), [0, visorY, FRONT_Z + 0.06]))
      const scan = mesh(roundBox(HEAD.w - 0.16, 0.014, 0.01), glowMat('#FEF9C3', 1.4), [0, visorY, FRONT_Z + 0.075])
      g.add(scan)
      const edge = mesh(new THREE.TorusGeometry(1, 0.008, 6, 64), yellow, [0, visorY, FRONT_Z + 0.07])
      edge.scale.set((HEAD.w - 0.1) / 2, 0.15, 1)
      g.add(edge)
      fx.push((t) => {
        scan.position.y = visorY + Math.sin(t * 2.2) * 0.11
        sparkGlow.material.opacity = Math.sin(t * 9) > 0.2 ? 0.8 : 0.3
      })
      return g
    }
    case 'titan': {
      const obsidian = new THREE.MeshPhysicalMaterial({ color: '#1C1416', roughness: 0.3, clearcoat: 0.8, metalness: 0.2 })
      const lava = glowMat('#F97316', 1)
      g.add(fittedCap(222, obsidian, 0.05, 0.06))
      g.add(mesh(roundBox(HEAD.w + 0.12, 0.08, 0.38), satin('#3A2A2E'), [0, wy(220), 0]))
      // Horns curving up and out.
      for (const side of [-1, 1]) {
        const horn = bentCone(0.1, 0.62, side * 0.26, toy('#4A3236', 0.3, 0.8))
        horn.position.set(side * (HEAD.w / 2 - 0.02), wy(190), 0.06)
        horn.rotation.z = side * -0.55
        g.add(horn)
        const tipAt = new THREE.Vector3(side * 0.26, 0.6, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), side * -0.55).add(horn.position)
        g.add(glow('#FB923C', 0.7, 0.22, 0.22, [tipAt.x, tipAt.y, tipAt.z]))
      }
      // Lava glowing through cracks on the front of the helm.
      const front = (HEAD.depth + 0.12) / 2 + 0.035
      const cracks: [number, number][][] = [[[160, 200], [200, 170], [214, 130]], [[300, 70], [292, 110], [320, 150], [304, 206]], [[420, 190], [392, 160], [404, 118]]]
      for (const c of cracks) {
        const pts = c.map(([x, y]) => new THREE.Vector3(...art(x, y), front))
        g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), 24, 0.011, 6, false), lava))
      }
      const gem = mesh(new THREE.OctahedronGeometry(0.06, 0), glowMat('#F43F5E', 1.1), [0, wy(220), FRONT_Z + 0.09])
      gem.scale.set(0.8, 1.2, 0.5)
      const heat = glow('#FB923C', 0.5, 0.4, 0.4, [0, wy(220), FRONT_Z + 0.12])
      g.add(gem, heat)
      fx.push((t) => {
        const k = 0.5 + 0.5 * Math.sin(t * 3.1)
        lava.emissiveIntensity = 0.7 + 0.8 * k
        heat.material.opacity = 0.3 + 0.4 * k
      })
      return g
    }
    case 'olympian': {
      // A golden laurel wreath: a thin ring with leaves all around the front half.
      const wreath = new THREE.Group()
      const ring = mesh(new THREE.TorusGeometry(1, 0.012, 8, 64), gold())
      ring.rotation.x = Math.PI / 2
      wreath.add(ring)
      const leaf = slab(leafShape(0.05, 0.15), 0.008, 0.004)
      const leafMat = new THREE.MeshPhysicalMaterial({ color: '#F2C94C', metalness: 0.35, roughness: 0.35, clearcoat: 1, emissive: '#5A4300', emissiveIntensity: 0.3 })
      for (let i = 0; i <= 16; i++) {
        const a = Math.PI * 0.05 + (i / 16) * Math.PI * 0.9 // across the front, side to side
        for (const tilt of [-0.7, 0.7]) {
          const l = mesh(leaf, leafMat, [Math.cos(a), 0, Math.sin(a)])
          l.lookAt(Math.cos(a) * 2, 0, Math.sin(a) * 2)
          l.rotateZ(tilt + (a - Math.PI / 2) * 0.6)
          l.rotateX(-0.4)
          wreath.add(l)
        }
      }
      wreath.position.set(0, wy(150), 0)
      wreath.scale.set(HEAD.w / 2 + 0.06, 1, HEAD.depth / 2 + 0.12)
      wreath.rotation.x = 0.18
      g.add(wreath)
      const gem = mesh(new THREE.SphereGeometry(0.045, 20, 14), glowMat('#B7F33B', 0.9), [0, wy(150), HEAD.depth / 2 + 0.14])
      g.add(gem, glow('#B7F33B', 0.5, 0.3, 0.3, [0, wy(150), HEAD.depth / 2 + 0.16]))
      return g
    }
    case 'soulbound': {
      // Two halos linked above the head, turning slowly.
      const halos = new THREE.Group()
      halos.position.set(0, wy(48), 0)
      const cyan = mesh(new THREE.TorusGeometry(0.3, 0.022, 12, 64), glowMat('#22D3EE', 1), [-0.12, 0, 0])
      const pink = mesh(new THREE.TorusGeometry(0.3, 0.022, 12, 64), glowMat('#F0ABFC', 1), [0.12, 0, 0])
      cyan.rotation.x = Math.PI / 2.3
      pink.rotation.x = Math.PI / 1.8
      halos.add(cyan, pink, glow('#A5F3FC', 0.4, 0.9, 0.35, [0, 0, 0]))
      g.add(halos)
      fx.push((t) => {
        halos.rotation.y = Math.sin(t * 0.8) * 0.4
        halos.position.y = wy(48) + Math.sin(t * 1.6) * 0.02
      })
      const h = mesh(slab(heartShape(0.06), 0.02, 0.006), glowMat('#F0ABFC', 0.8), [...art(300, 190), FRONT_Z + 0.04])
      g.add(h, glow('#22D3EE', 0.4, 0.32, 0.32, [...art(300, 190), FRONT_Z + 0.08]))
      return g
    }
    case 'cheer': {
      // A big bow on top of the head with a star clip, its loops bouncing.
      const bow = new THREE.Group()
      const pink = toy('#F472B6', 0.3, 0.9)
      for (const side of [-1, 1]) {
        const loop = mesh(new THREE.SphereGeometry(0.16, 28, 18), pink, [side * 0.17, 0, 0])
        loop.scale.set(1.15, 0.75, 0.45)
        loop.rotation.z = side * 0.35
        const tail = mesh(roundBox(0.06, 0.22, 0.02), toy('#EC4899', 0.3, 0.9), [side * 0.07, -0.13, 0.02])
        tail.rotation.z = side * 0.35
        bow.add(loop, tail)
        for (const [dx, dy] of [[0.08, 0.04], [0.2, -0.03]]) bow.add(mesh(new THREE.SphereGeometry(0.016, 10, 8), toy('#FFFFFF', 0.4, 0.5), [side * dx * 1.2, dy, 0.075]))
      }
      bow.add(mesh(new THREE.SphereGeometry(0.07, 20, 14), toy('#EC4899', 0.3, 0.9)))
      bow.add(mesh(slab(starShape(0.05), 0.014, 0.004), glowMat('#FDE68A', 0.6), [0, 0, 0.07]))
      bow.position.set(...art(300, 70), FRONT_Z + 0.02)
      bow.rotation.z = -0.12
      g.add(bow)
      fx.push((t) => bow.scale.setScalar(1 + 0.04 * Math.sin(t * 5)))
      // Face stickers: a star under one eye, a heart under the other.
      g.add(mesh(slab(starShape(0.05), 0.006, 0.002), toy('#FDE68A', 0.4, 0.6), [...art(196, 356), FRONT_Z + 0.008]))
      g.add(mesh(slab(heartShape(0.04), 0.006, 0.002), toy('#F472B6', 0.4, 0.6), [...art(404, 358), FRONT_Z + 0.008]))
      return g
    }
    default:
      return null
  }
}

/** The item in the raised hand (hand at the origin, +y up the item) and where its effect glows: [y, w, h]. */
export function kudosHeld(gear: Gear): { group: THREE.Group; glowAt: [number, number, number] } | null {
  const g = new THREE.Group()
  switch (gear) {
    case 'sage': {
      // A jade feather fan.
      const vein = satin('#047857')
      for (const [i, deg] of [-56, -34, -12, 12, 34, 56].entries()) {
        const f = feather(0.6, toy(i % 2 ? '#A7F3D0' : '#D1FAE5', 0.4, 0.5), vein)
        f.rotation.z = (-deg * Math.PI) / 180
        f.position.z = i * 0.004
        g.add(f)
      }
      const arc = mesh(new THREE.TorusGeometry(0.28, 0.012, 8, 40, Math.PI * 0.62), gold(), [0, 0, 0.03])
      arc.rotation.z = Math.PI * 0.19
      g.add(arc, mesh(new THREE.SphereGeometry(0.045, 16, 12), jade(), [0, 0, 0.03]))
      return { group: g, glowAt: [0.38, 0.6, 0.5] }
    }
    case 'archer': {
      // A starlight bow with an arrow of light nocked.
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...hand(548, 130), 0), new THREE.Vector3(...hand(620, 290), 0), new THREE.Vector3(...hand(548, 450), 0))
      g.add(mesh(new THREE.TubeGeometry(curve, 48, 0.02, 10, false), silver()))
      g.add(mesh(new THREE.TubeGeometry(curve, 48, 0.008, 6, false), glowMat('#38BDF8', 1), [0, 0, 0.018]))
      const string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([curve.getPoint(0), curve.getPoint(1)]), new THREE.LineBasicMaterial({ color: '#E0F2FE' }))
      g.add(string)
      for (const y of [130, 450]) {
        g.add(mesh(slab(starShape(0.05), 0.014, 0.004), glowMat('#FFFFFF', 0.9), [...hand(548, y), 0]))
        g.add(glow('#7DD3FC', 0.6, 0.22, 0.22, [...hand(548, y), 0.02]))
      }
      const arrow = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 8), glowMat('#7DD3FC', 0.9), [...hand(520, 290), 0.01])
      arrow.rotation.z = Math.PI / 2
      const tipM = mesh(new THREE.ConeGeometry(0.025, 0.07, 8), glowMat('#FFFFFF', 1), [...hand(604, 290), 0.01])
      tipM.rotation.z = -Math.PI / 2
      g.add(arrow, tipM)
      return { group: g, glowAt: [0, 0.5, 1.2] }
    }
    case 'volt': {
      // A crackling ball of lightning above the hand.
      const y = (294 - 196) * S
      g.add(mesh(new THREE.SphereGeometry(0.11, 32, 20), glowMat('#FEF9C3', 1.3), [0, y, 0]))
      g.add(mesh(new THREE.SphereGeometry(0.15, 32, 20), glass('#FACC15', 0.3), [0, y, 0]))
      g.add(glow('#FACC15', 0.7, 0.6, 0.6, [0, y, 0.02]))
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const pts = [new THREE.Vector3(0, y, 0)]
        for (let k = 1; k <= 4; k++) pts.push(new THREE.Vector3(Math.cos(a) * k * 0.06 + Math.sin(i * 5 + k) * 0.02, y + Math.sin(a) * k * 0.06 + Math.cos(i * 3 + k) * 0.02, 0.02))
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: i % 2 ? '#FFFFFF' : '#FDE047', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, toneMapped: false })))
      }
      return { group: g, glowAt: [y, 0.5, 0.5] }
    }
    case 'titan': {
      // A huge meteor hammer: black rock head with lava cracks, flames on top.
      const headY = (294 - 150) * S
      g.add(mesh(new THREE.CylinderGeometry(0.026, 0.03, headY + 0.05, 16), satin('#3A2A2E'), [0, headY / 2 - 0.02, 0]))
      for (const y of [160, 200, 240]) g.add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 16), glowMat('#F97316', 0.8), [0, (294 - y) * S, 0]))
      const rock = mesh(new THREE.DodecahedronGeometry(0.2, 1), toy('#2A1A1E', 0.6, 0.2), [0, headY, 0])
      rock.scale.set(1.5, 0.75, 0.9)
      g.add(rock)
      const lava = glowMat('#F97316', 1.2)
      for (const [x, y, rz] of [[-0.14, 0.03, 0.6], [0.04, -0.02, -0.4], [0.17, 0.04, 1.1], [-0.02, 0.07, 1.6]] as const) {
        const c = mesh(roundBox(0.1, 0.014, 0.01), lava, [x, headY + y, 0.17])
        c.rotation.z = rz
        g.add(c)
      }
      for (const [i, x] of [-0.13, -0.04, 0.05, 0.14].entries()) g.add(glow(i % 2 ? '#FB923C' : '#FDE68A', 0.8, 0.12, 0.26, [x, headY + 0.2, 0.02]))
      return { group: g, glowAt: [headY, 0.7, 0.5] }
    }
    case 'olympian': {
      // A golden torch with a living flame.
      g.add(mesh(new THREE.CylinderGeometry(0.06, 0.026, 0.56, 24), gold(), [0, 0.28, 0]))
      g.add(mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.06, 24), gold(), [0, 0.57, 0]))
      for (const y of [0.22, 0.38]) {
        const ring = mesh(new THREE.TorusGeometry(0.045, 0.008, 8, 24), toy('#8C6A12', 0.4, 0.4), [0, y, 0])
        ring.rotation.x = Math.PI / 2
        g.add(ring)
      }
      g.add(glow('#FB923C', 0.85, 0.3, 0.5, [0, 0.78, 0]), glow('#FDE047', 0.95, 0.2, 0.36, [0, 0.74, 0.01]), glow('#ECFCCB', 1, 0.1, 0.18, [0, 0.68, 0.02]))
      return { group: g, glowAt: [0.75, 0.4, 0.5] }
    }
    case 'soulbound': {
      // A lantern holding two hearts.
      const frame = silver()
      const top = (294 - 114) * S
      const bottom = (294 - 258) * S
      g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, bottom + 0.02, 8), frame, [0, bottom / 2 - 0.01, 0]))
      g.add(mesh(roundBox(0.3, 0.05, 0.3), frame, [0, bottom, 0]), mesh(roundBox(0.3, 0.05, 0.3), frame, [0, top, 0]))
      g.add(mesh(new THREE.ConeGeometry(0.09, 0.1, 4), frame, [0, top + 0.07, 0]))
      g.add(mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 24), frame, [0, top + 0.15, 0]))
      g.add(mesh(new THREE.BoxGeometry(0.26, top - bottom - 0.04, 0.26), glass('#CFFAFE', 0.3), [0, (top + bottom) / 2, 0]))
      const mid = (top + bottom) / 2
      g.add(mesh(slab(heartShape(0.05), 0.02, 0.006), glowMat('#22D3EE', 1.2), [-0.04, mid - 0.02, 0]))
      g.add(mesh(slab(heartShape(0.05), 0.02, 0.006), glowMat('#F0ABFC', 1.2), [0.05, mid + 0.05, 0.02]))
      g.add(glow('#22D3EE', 0.55, 0.5, 0.6, [0, mid, 0.05]))
      return { group: g, glowAt: [mid, 0.4, 0.5] }
    }
    case 'cheer': {
      const p = pomPom(0.2)
      p.position.y = (294 - 236) * S
      g.add(p)
      return { group: g, glowAt: [(294 - 236) * S, 0.55, 0.55] }
    }
    default:
      return null
  }
}

/** Left-hand items (local origin is the hand): Soulbound's spirit fox, the second pom-pom. */
export function kudosOffhand(gear: Gear, fx: Step[] = []): THREE.Group | null {
  const g = new THREE.Group()
  switch (gear) {
    case 'soulbound': {
      // A little spirit fox floating by the hand.
      const fox = new THREE.Group()
      const body = mesh(new THREE.SphereGeometry(0.14, 28, 20), glass('#CFFAFE', 0.85))
      body.scale.set(1, 0.95, 0.85)
      fox.add(body, glow('#22D3EE', 0.5, 0.5, 0.5, [0, 0, 0]))
      for (const side of [-1, 1]) {
        const ear = mesh(new THREE.ConeGeometry(0.045, 0.11, 12), glass('#CFFAFE', 0.9), [side * 0.08, 0.13, 0])
        ear.rotation.z = side * -0.35
        fox.add(ear)
        fox.add(mesh(new THREE.SphereGeometry(0.022, 12, 10), toy('#0E4A5C', 0.3, 0.8), [side * 0.05, 0.02, 0.115]))
        fox.add(mesh(new THREE.SphereGeometry(0.02, 10, 8), toy('#F0ABFC', 0.5, 0.2), [side * 0.085, -0.03, 0.105]))
      }
      fox.position.set(0, 0.24, 0.12)
      g.add(fox)
      fx.push((t) => {
        fox.position.y = 0.24 + Math.sin(t * 2) * 0.03
        fox.rotation.z = Math.sin(t * 1.3) * 0.12
      })
      return g
    }
    case 'cheer': {
      const p = pomPom(0.17)
      p.position.set(0, 0.02, 0.1)
      g.add(p)
      fx.push((t) => (p.rotation.z = Math.sin(t * 9) * 0.15))
      return g
    }
    default:
      return null
  }
}

/** Robes, armor and uniforms around the handle (radius `r`). */
export function kudosBody(gear: Gear, r: number, g: THREE.Group) {
  const at = (y: number) => wy(y)
  const tube = (top: number, bottom: number, material: THREE.Material, grow = 0.03, flare = 0.03) =>
    g.add(mesh(new THREE.CylinderGeometry(r + grow, r + grow + flare, (bottom - top) * S, 32), material, [0, at((top + bottom) / 2), 0]))
  const band = (y: number, h: number, material: THREE.Material, grow = 0.045) =>
    g.add(mesh(new THREE.CylinderGeometry(r + grow, r + grow, h * S, 32), material, [0, at(y), 0]))
  const vee = (y: number, material: THREE.Material, w = 0.03) => {
    for (const side of [-1, 1]) {
      const s = mesh(roundBox(w, 0.2, 0.02), material, [side * 0.045, at(y), r + 0.045])
      s.rotation.z = side * 0.5
      g.add(s)
    }
  }
  switch (gear) {
    case 'sage':
      tube(504, 690, toy('#ECFDF5', 0.5, 0.3), 0.04, 0.12)
      vee(526, satin('#10B981'), 0.04)
      band(583, 18, jade())
      g.add(mesh(new THREE.SphereGeometry(0.04, 16, 12), jade(), [0, at(583), r + 0.07]))
      break
    case 'archer': {
      tube(504, 612, satin('#1E2A5A'), 0.03, 0.03)
      const strap = mesh(roundBox(0.04, 0.42, 0.02), silver(), [0, at(552), r + 0.04])
      strap.rotation.z = 0.7
      g.add(strap)
      band(584, 10, silver())
      g.add(mesh(slab(starShape(0.04), 0.012, 0.004), glowMat('#38BDF8', 0.9), [-0.05, at(530), r + 0.05]))
      break
    }
    case 'volt': {
      tube(504, 612, glossy('#15171C'), 0.03, 0.02)
      vee(530, glowMat('#FACC15', 0.9), 0.016)
      for (const side of [-1, 1]) g.add(mesh(roundBox(0.014, 0.3, 0.014), glowMat('#FACC15', 0.9), [side * (r + 0.02), at(570), r * 0.6]))
      g.add(mesh(slab(lightningShape(0.12), 0.012, 0.004), glowMat('#FACC15', 1), [-0.01, at(538), r + 0.045]))
      break
    }
    case 'titan': {
      tube(504, 608, new THREE.MeshPhysicalMaterial({ color: '#1C1416', roughness: 0.3, clearcoat: 0.8, metalness: 0.2 }), 0.035, 0.03)
      for (const side of [-1, 1]) {
        const pauldron = mesh(new THREE.SphereGeometry(0.12, 24, 16), toy('#2A1A1E', 0.4, 0.6), [side * (r + 0.1), at(494), 0])
        pauldron.scale.y = 0.7
        const spike = mesh(new THREE.ConeGeometry(0.035, 0.16, 8), toy('#3A2A2E', 0.4, 0.5), [side * (r + 0.16), at(468), 0])
        spike.rotation.z = side * -0.6
        g.add(pauldron, spike)
      }
      const lava = glowMat('#F97316', 1)
      for (const [x, y, rz] of [[-0.04, 534, 0.6], [0.03, 560, -0.5], [0, 586, 0.2]] as const) {
        const c = mesh(roundBox(0.09, 0.012, 0.01), lava, [x, at(y), r + 0.04])
        c.rotation.z = rz
        g.add(c)
      }
      band(598, 16, satin('#3A2A2E'))
      break
    }
    case 'olympian': {
      tube(504, 640, toy('#FFFFFF', 0.55, 0.2), 0.03, 0.05)
      const sash = mesh(roundBox(0.07, 0.5, 0.02), gold(), [0, at(560), r + 0.045])
      sash.rotation.z = -0.75
      g.add(sash)
      vee(512, toy('#B7F33B', 0.4, 0.5), 0.03)
      const medal = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.016, 32), gold(), [0, at(552), r + 0.075])
      medal.rotation.x = Math.PI / 2
      g.add(medal, mesh(slab(starShape(0.03), 0.006, 0.002), toy('#FFF4C2', 0.4, 0.6), [0, at(552), r + 0.085]))
      break
    }
    case 'soulbound': {
      tube(504, 680, satin('#0E4A5C'), 0.04, 0.12)
      const trim = mesh(new THREE.TorusGeometry(r + 0.16, 0.012, 8, 48), glowMat('#F0ABFC', 0.8), [0, at(676), 0])
      trim.rotation.x = Math.PI / 2
      g.add(trim)
      g.add(mesh(slab(heartShape(0.045), 0.014, 0.004), glowMat('#F0ABFC', 0.9), [0, at(532), r + 0.055]))
      break
    }
    case 'cheer': {
      tube(504, 594, toy('#FFFFFF', 0.45, 0.4), 0.03, 0.02)
      vee(524, toy('#F472B6', 0.35, 0.8), 0.045)
      g.add(mesh(slab(starShape(0.035), 0.01, 0.003), toy('#F472B6', 0.35, 0.8), [0, at(576), r + 0.045]))
      // A pleated skirt (a flat-shaded flared ring).
      const skirt = mesh(new THREE.CylinderGeometry(r + 0.04, r + 0.14, 58 * S, 16, 1, true), new THREE.MeshPhysicalMaterial({ color: '#F472B6', roughness: 0.4, clearcoat: 0.6, flatShading: true, side: THREE.DoubleSide }), [0, at(617), 0])
      g.add(skirt)
      const hem = mesh(new THREE.TorusGeometry(r + 0.138, 0.01, 6, 48), toy('#FFFFFF', 0.4, 0.4), [0, at(644), 0])
      hem.rotation.x = Math.PI / 2
      g.add(hem)
      break
    }
  }
}

/** Each skin's own backdrop behind the premium glow. `steps` animate it. */
export function kudosPremium(gear: Gear, g: THREE.Group, steps: Step[]) {
  /** Things that fall from the top and loop: y goes from `top` down by `drop`, staggered by `offset`. */
  const fall = (o: THREE.Object3D, top: number, drop: number, speed: number, offset: number, drift = 0, spin = 0) => {
    const x0 = o.position.x
    steps.push((t) => {
      const k = ((t * speed + offset) % 1 + 1) % 1
      o.position.y = top - k * drop
      o.position.x = x0 + Math.sin(t * 1.3 + offset * 9) * drift
      if (spin) o.rotation.set(t * spin + offset, t * spin * 0.7, 0)
    })
  }
  const twinkle = (s: THREE.Sprite, base: number, speed: number, phase: number) =>
    steps.push((t) => (s.material.opacity = base * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * speed + phase)))))

  switch (gear) {
    case 'sage': {
      // An ink-brush circle behind, ripples at the feet, feathers drifting down, jade orbs.
      const enso = mesh(new THREE.TorusGeometry(1.05, 0.045, 10, 96, Math.PI * 1.75), glowMat('#10B981', 0.5), [0, 1.45, -0.8])
      enso.rotation.z = 0.5
      g.add(enso)
      for (let i = 0; i < 3; i++) {
        const ripple = mesh(new THREE.TorusGeometry(0.5, 0.008, 6, 64), new THREE.MeshBasicMaterial({ color: '#6EE7B7', transparent: true, opacity: 0.6, toneMapped: false }), [0, 0.015, 0])
        ripple.rotation.x = Math.PI / 2
        g.add(ripple)
        steps.push((t) => {
          const k = ((t * 0.35 + i / 3) % 1)
          ripple.scale.setScalar(0.6 + k * 1.4)
          ;(ripple.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k)
        })
      }
      const fMat = toy('#D1FAE5', 0.4, 0.5)
      const vein = satin('#10B981')
      for (let i = 0; i < 5; i++) {
        const f = feather(0.22, fMat, vein)
        f.position.set(-1 + i * 0.5, 2.8, -0.4 + (i % 2) * 0.3)
        g.add(f)
        fall(f, 3.0, 3.0, 0.08, i / 5, 0.25, 0.6)
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const orb = glow('#34D399', 0.8, 0.14, 0.14, [Math.cos(a) * 1.1, 1.4 + Math.sin(a) * 1.1, -0.5])
        g.add(orb)
        twinkle(orb, 0.8, 2.2, i)
      }
      break
    }
    case 'archer': {
      // A target behind, its rings glowing; falling stars streak past.
      const target = new THREE.Group()
      target.position.set(0, 1.45, -0.85)
      for (const [i, rad] of [1.05, 0.8, 0.55, 0.3].entries()) {
        const ring = mesh(new THREE.TorusGeometry(rad, i === 3 ? 0.035 : 0.018, 8, 80), new THREE.MeshBasicMaterial({ color: i % 2 ? '#7DD3FC' : '#38BDF8', transparent: true, opacity: 0.35 + i * 0.1, toneMapped: false }))
        target.add(ring)
      }
      const bull = glow('#E0F2FE', 0.7, 0.3, 0.3, [0, 0, 0.01])
      target.add(bull)
      g.add(target)
      twinkle(bull, 0.7, 2, 0)
      for (let i = 0; i < 4; i++) {
        const star = new THREE.Group()
        star.add(mesh(slab(starShape(0.06), 0.01, 0.003), glowMat('#FFFFFF', 1.2)))
        const trail = glow('#BAE6FD', 0.55, 0.6, 0.1, [0.28, 0.12, 0])
        trail.material.rotation = 0.42
        star.add(trail)
        g.add(star)
        steps.push((t) => {
          const k = ((t * 0.18 + i / 4) % 1)
          star.position.set(1.4 - k * 2.8, 3.1 - k * 1.3, -0.5)
          star.visible = k < 0.6
        })
      }
      for (let i = 0; i < 8; i++) {
        const s = glow('#BAE6FD', 0.9, 0.1, 0.1, [Math.sin(i * 7.1) * 1.3, 0.6 + ((i * 0.37) % 1) * 2.2, -0.6])
        g.add(s)
        twinkle(s, 0.9, 2.6, i * 1.3)
      }
      break
    }
    case 'volt': {
      // A neon grid on the floor, bolts flashing behind, a dashed ring turning.
      const gridMat = new THREE.LineBasicMaterial({ color: '#FACC15', transparent: true, opacity: 0.45, toneMapped: false })
      const pts: THREE.Vector3[] = []
      for (let i = -5; i <= 5; i++) pts.push(new THREE.Vector3(i * 0.22, 0.01, -1.1), new THREE.Vector3(i * 0.22, 0.01, 0.9))
      for (let j = 0; j <= 9; j++) pts.push(new THREE.Vector3(-1.1, 0.01, -1.1 + j * 0.22), new THREE.Vector3(1.1, 0.01, -1.1 + j * 0.22))
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), gridMat))
      steps.push((t) => (gridMat.opacity = 0.3 + 0.2 * Math.sin(t * 2.5)))
      const boltMat = glowMat('#FDE047', 1.4)
      for (const [i, [x, y, s]] of ([[-1.0, 2.6, 1], [1.0, 2.4, -1], [-1.15, 1.3, 1], [1.15, 1.2, -1]] as const).entries()) {
        const b = mesh(slab(lightningShape(0.7), 0.02, 0.006), boltMat, [x, y, -0.6])
        b.scale.x = s
        g.add(b)
        steps.push((t) => (b.visible = Math.sin(t * 7 + i * 2.1) > 0.3))
      }
      const dashes = new THREE.Group()
      dashes.position.set(0, 1.45, -0.8)
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2
        const d = mesh(roundBox(0.02, 0.06, 0.01), boltMat, [Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0])
        d.rotation.z = a
        dashes.add(d)
      }
      g.add(dashes)
      steps.push((t) => (dashes.rotation.z = t * 0.4))
      break
    }
    case 'titan': {
      // Meteors streaking down, a lava crater at the feet with flames and rising embers.
      for (let i = 0; i < 4; i++) {
        const meteor = new THREE.Group()
        meteor.add(mesh(new THREE.DodecahedronGeometry(0.07, 0), toy('#3A1A12', 0.6, 0.2)))
        meteor.add(glow('#F97316', 0.9, 0.22, 0.22, [0, 0, 0.02]))
        const trail = glow('#FB923C', 0.6, 0.8, 0.14, [0.36, 0.16, -0.01])
        trail.material.rotation = 0.42
        meteor.add(trail)
        g.add(meteor)
        steps.push((t) => {
          const k = ((t * 0.22 + i / 4) % 1)
          meteor.position.set(1.5 - k * 3, 3.2 - k * 1.4, -0.55 - (i % 2) * 0.2)
          meteor.rotation.z = t * 3
          meteor.visible = k < 0.65
        })
      }
      const crater = mesh(new THREE.TorusGeometry(0.62, 0.025, 8, 64), glowMat('#F97316', 1.2), [0, 0.015, 0])
      crater.rotation.x = Math.PI / 2
      g.add(crater)
      steps.push((t) => ((crater.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.8 + 0.6 * Math.sin(t * 3)))
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const f = glow(i % 2 ? '#FB923C' : '#F43F5E', 0.8, 0.2, 0.4, [Math.cos(a) * 0.62, 0.18, Math.sin(a) * 0.62])
        g.add(f)
        steps.push((t) => {
          const k = 0.8 + 0.3 * Math.sin(t * 9 + i * 1.4)
          f.scale.set(0.2, 0.4 * k, 1)
        })
      }
      for (let i = 0; i < 6; i++) {
        const e = glow('#FDBA74', 0.9, 0.06, 0.06, [Math.sin(i * 4.3) * 0.8, 0.2, Math.cos(i * 2.1) * 0.5])
        g.add(e)
        steps.push((t) => {
          const k = ((t * 0.4 + i / 6) % 1)
          e.position.y = 0.2 + k * 1.6
          e.material.opacity = 0.9 * (1 - k)
        })
      }
      break
    }
    case 'olympian': {
      // Golden rays, marble columns either side and a laurel arch overhead.
      const fan = new THREE.Group()
      fan.position.set(0, 1.45, -0.9)
      const rayMat = new THREE.MeshBasicMaterial({ color: '#FDE68A', transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
      for (let i = 0; i < 16; i++) {
        const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.5), rayMat)
        ray.geometry.translate(0, 0.75, 0)
        ray.rotation.z = (i / 16) * Math.PI * 2
        fan.add(ray)
      }
      g.add(fan)
      steps.push((t) => (fan.rotation.z = t * 0.08))
      const marble = toy('#EDE6D3', 0.55, 0.3)
      for (const side of [-1, 1]) {
        const col = new THREE.Group()
        col.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.1, 16), marble, [0, 1.12, 0]))
        col.add(mesh(roundBox(0.28, 0.08, 0.28), marble, [0, 2.2, 0]), mesh(roundBox(0.28, 0.08, 0.28), marble, [0, 0.04, 0]))
        col.position.set(side * 1.1, 0, -0.55)
        g.add(col)
      }
      const leafMat = new THREE.MeshPhysicalMaterial({ color: '#B7F33B', roughness: 0.4, clearcoat: 0.6, side: THREE.DoubleSide })
      const leaf = slab(leafShape(0.04, 0.13), 0.006, 0.003)
      for (let i = 0; i <= 18; i++) {
        const a = Math.PI * 0.1 + (i / 18) * Math.PI * 0.8
        for (const tilt of [-0.6, 0.6]) {
          const l = mesh(leaf, leafMat, [Math.cos(a) * 1.15, 1.85 + Math.sin(a) * 0.95, -0.6])
          l.rotation.z = a - Math.PI / 2 + tilt + Math.PI
          g.add(l)
        }
      }
      break
    }
    case 'soulbound': {
      // Two big linked rings behind (one per partner), hearts rising, spirit sparkles.
      const rings = new THREE.Group()
      rings.position.set(0, 1.45, -0.85)
      const a = mesh(new THREE.TorusGeometry(0.85, 0.02, 8, 96), glowMat('#22D3EE', 0.9), [-0.3, 0, 0])
      const b = mesh(new THREE.TorusGeometry(0.85, 0.02, 8, 96), glowMat('#F0ABFC', 0.9), [0.3, 0, 0])
      a.scale.y = 1.2
      b.scale.y = 1.2
      rings.add(a, b)
      g.add(rings)
      steps.push((t) => {
        a.rotation.y = Math.sin(t * 0.7) * 0.4
        b.rotation.y = -Math.sin(t * 0.7) * 0.4
      })
      const heart = slab(heartShape(0.06), 0.014, 0.004)
      for (let i = 0; i < 6; i++) {
        const h = mesh(heart, glowMat(i % 2 ? '#F0ABFC' : '#22D3EE', 1), [-1 + (i % 3) * 1, 0.3, -0.45 + (i % 2) * 0.25])
        g.add(h)
        steps.push((t) => {
          const k = ((t * 0.16 + i / 6) % 1)
          h.position.y = 0.3 + k * 2.6
          h.position.x = -1 + (i % 3) * 1 + Math.sin(t * 1.5 + i) * 0.15
          h.scale.setScalar(Math.sin(k * Math.PI))
        })
      }
      for (let i = 0; i < 8; i++) {
        const s = glow(i % 2 ? '#A5F3FC' : '#F5D0FE', 0.9, 0.12, 0.12, [Math.sin(i * 5.3) * 1.2, 0.6 + ((i * 0.41) % 1) * 2.2, -0.5])
        g.add(s)
        twinkle(s, 0.9, 2.4, i)
      }
      break
    }
    case 'cheer': {
      // Confetti falling and spinning, sparkles, and a "GO!" sign.
      const colors = ['#F472B6', '#FDE68A', '#67E8F9', '#C084FC', '#FFFFFF', '#FB7185']
      const pieces = colors.map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }))
      const rect = new THREE.PlaneGeometry(0.05, 0.03)
      const starGeo = new THREE.ShapeGeometry(starShape(0.035))
      for (let i = 0; i < 36; i++) {
        const c = new THREE.Mesh(i % 4 === 0 ? starGeo : rect, pieces[i % 6])
        c.position.set(Math.sin(i * 12.9) * 1.25, 2.9, -0.7 + ((i * 0.37) % 1) * 1.2)
        g.add(c)
        fall(c, 3.0, 3.1, 0.12 + ((i * 0.13) % 1) * 0.08, (i * 0.618) % 1, 0.15, 3)
      }
      for (let i = 0; i < 5; i++) {
        const s = mesh(slab(starShape(0.08), 0.01, 0.003), glowMat('#FDE68A', 1), [Math.sin(i * 2.3) * 1.15, 0.8 + i * 0.4, -0.6])
        g.add(s)
        steps.push((t) => s.scale.setScalar(0.5 + 0.5 * Math.abs(Math.sin(t * 2 + i))))
      }
      const sign = mesh(new THREE.PlaneGeometry(0.42, 0.21), new THREE.MeshBasicMaterial({ map: textTexture('GO!', '#FFFFFF', '#EC4899'), transparent: true }), [0.95, 0.55, -0.3])
      sign.rotation.z = 0.15
      g.add(sign)
      steps.push((t) => (sign.rotation.z = 0.15 + Math.sin(t * 3) * 0.08))
      break
    }
  }
}
