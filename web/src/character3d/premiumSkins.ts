import * as THREE from 'three'
import type { Gear } from '../cosmetics/visuals'
import { FRONT_Z, HEAD, S, art, fittedCap, gold, roundBox, satin, slab, wy } from './gear'
import { mesh, toy } from './materials'
import { flameTexture, glowTexture } from './textures'

// The second wave of premium (Mythic, bought with coins) skins in 3D, matching
// components/character/premiumSkinsArt.tsx: Frost Monarch, Spirit Kitsune and Neon Ronin.

type Step = (t: number) => void

const glowMat = (color: string, intensity = 0.8) =>
  new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.25, clearcoat: 1 })
const silver = () => new THREE.MeshPhysicalMaterial({ color: '#E3EEF8', metalness: 0.9, roughness: 0.15 })
const ice = (opacity = 0.82) =>
  new THREE.MeshPhysicalMaterial({ color: '#D6F1FF', emissive: '#4AA8E0', emissiveIntensity: 0.35, roughness: 0.05, metalness: 0.1, clearcoat: 1, transparent: true, opacity })
const armor = () => new THREE.MeshPhysicalMaterial({ color: '#1A1D26', metalness: 0.65, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2 })
/** Additive, unlit: holograms, light streaks. */
const holo = (color: string, opacity = 0.7, map: THREE.Texture | null = null) =>
  new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })

/** A face-on additive glow. */
function sprite(color: string, opacity: number, w: number, h: number, at: [number, number, number], map = glowTexture()) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  s.scale.set(w, h, 1)
  s.position.set(...at)
  return s
}

/** An ice crystal: a long octahedron, `w` wide and `h` tall, centred on its middle. */
function crystal(w: number, h: number, material: THREE.Material, at: [number, number, number]) {
  const c = mesh(new THREE.OctahedronGeometry(1, 0), material, at)
  c.scale.set(w, h / 2, w * 0.8)
  return c
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Bright along the bottom edge, fading upward: an aurora curtain or a falling data streak. */
const curtainTexture = () =>
  canvasTexture(4, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.6, 'rgba(255,255,255,0.55)')
    g.addColorStop(0.88, 'rgba(255,255,255,1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 4, 128)
  })

/** A six-armed snowflake, white on transparent. */
const snowflakeTexture = () =>
  canvasTexture(64, 64, (ctx) => {
    ctx.translate(32, 32)
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineCap = 'round'
    ctx.shadowColor = '#BAE6FD'
    ctx.shadowBlur = 6
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3)
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -26)
      ctx.stroke()
      ctx.lineWidth = 3
      for (const [y, l] of [[-12, 8], [-20, 6]]) {
        ctx.beginPath()
        ctx.moveTo(-l, y - l)
        ctx.lineTo(0, y)
        ctx.lineTo(l, y - l)
        ctx.stroke()
      }
    }
  })

/** A paper zigzag (shide) hanging down from the origin. */
function zigzag(h: number) {
  const s = new THREE.Shape()
  const w = h * 0.24
  const k = h / 4
  // Four strips of paper, each stepped half a width to the side of the one above.
  const pts: [number, number][] = [
    [0, 0], [w, 0], [w, -k], [1.5 * w, -k], [1.5 * w, -2 * k], [w, -2 * k], [w, -3 * k], [1.5 * w, -3 * k],
    [1.5 * w, -4 * k], [0.5 * w, -4 * k], [0.5 * w, -3 * k], [0, -3 * k], [0, -2 * k], [0.5 * w, -2 * k], [0.5 * w, -k], [0, -k],
  ]
  s.moveTo(...pts[0])
  for (const p of pts.slice(1)) s.lineTo(...p)
  s.closePath()
  return s
}

/** Hats, crowns, helmets and what's worn on the face. `fx` collects per-frame updates. */
export function premiumHat(gear: Gear, fx: Step[] = []): THREE.Group | null {
  const g = new THREE.Group()
  switch (gear) {
    case 'frost': {
      // A silver circlet with a crown of ice crystals rising out of the head.
      const band = mesh(new THREE.TorusGeometry(1, 0.026, 12, 64), silver(), [0, wy(196), 0])
      band.rotation.x = Math.PI / 2
      band.scale.set(HEAD.w / 2 + 0.04, HEAD.depth / 2 + 0.09, 1)
      g.add(band)
      const iceMat = ice()
      const tips: THREE.Sprite[] = []
      for (const [x, h, tilt] of [[-0.44, 0.42, 0.32], [-0.23, 0.6, 0.14], [0, 0.86, 0], [0.23, 0.6, -0.14], [0.44, 0.42, -0.32]] as const) {
        const c = crystal(0.11, h, iceMat, [x, 2.3 + h * 0.25, 0])
        c.rotation.z = tilt
        g.add(c)
        const tip = new THREE.Vector3(0, h / 2, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt).add(c.position)
        const s = sprite('#E0F2FE', 0.8, 0.16, 0.16, [tip.x, tip.y, 0.04])
        tips.push(s)
        g.add(s)
      }
      // Ice gems set in the front of the circlet.
      for (const [x, k] of [[226, 0.75], [300, 1.15], [374, 0.75]] as const) {
        const gem = mesh(new THREE.OctahedronGeometry(0.04 * k, 0), glowMat('#7DD3FC', 0.9), [...art(x, 196), FRONT_Z + 0.04])
        gem.scale.set(1, 1.3, 0.6)
        g.add(gem)
      }
      const shine = sprite('#BAE6FD', 0.4, 0.9, 0.55, [0, 2.6, -0.02])
      g.add(shine)
      fx.push((t) => {
        shine.material.opacity = 0.3 + 0.15 * Math.sin(t * 1.8)
        tips.forEach((s, i) => {
          const k = 0.5 + 0.5 * Math.sin(t * 3.1 + i * 1.9)
          s.material.opacity = 0.2 + 0.8 * k
          s.scale.setScalar(0.06 + 0.12 * k)
        })
      })
      return g
    }
    case 'kitsune': {
      // Fox ears with red tips (twitching now and then), a festival fox mask worn on the side of the head.
      const white = toy('#FFF7F2', 0.4, 0.5)
      for (const side of [-1, 1]) {
        const ear = new THREE.Group()
        const outer = mesh(new THREE.ConeGeometry(0.16, 0.42, 24), white, [0, 0.21, 0])
        outer.scale.z = 0.45
        const inner = mesh(new THREE.ConeGeometry(0.095, 0.3, 24), toy('#FF9CC8', 0.4, 0.5), [0, 0.16, 0.045])
        inner.scale.z = 0.3
        const tip = mesh(new THREE.ConeGeometry(0.058, 0.12, 24), toy('#E11D48', 0.35, 0.6), [0, 0.36, 0])
        tip.scale.z = 0.5
        ear.add(outer, inner, tip)
        ear.position.set(side * 0.38, wy(112), 0)
        ear.rotation.z = side * -0.32
        g.add(ear)
        // A quick twitch every few seconds, otherwise still.
        fx.push((t) => (ear.rotation.z = side * -0.32 + side * 0.12 * Math.max(0, Math.sin(t * 1.3 + side)) ** 12))
      }
      const mask = new THREE.Group()
      const face = mesh(new THREE.SphereGeometry(1, 32, 20), toy('#FFFFFF', 0.22, 0.9))
      face.scale.set(0.15, 0.13, 0.06)
      const snout = mesh(new THREE.SphereGeometry(1, 24, 16), toy('#FFFFFF', 0.22, 0.9), [0, -0.06, 0.04])
      snout.scale.set(0.07, 0.05, 0.045)
      mask.add(face, snout, mesh(new THREE.SphereGeometry(0.014, 12, 10), toy('#1A1D24', 0.3, 0.5), [0, -0.05, 0.085]))
      for (const side of [-1, 1]) {
        const ear = mesh(new THREE.ConeGeometry(0.05, 0.11, 16), toy('#FFFFFF', 0.22, 0.9), [side * 0.09, 0.13, 0])
        ear.rotation.z = side * -0.4
        ear.scale.z = 0.5
        const stripe = mesh(roundBox(0.07, 0.016, 0.01), toy('#E11D48', 0.3, 0.6), [side * 0.055, 0.025, 0.058])
        stripe.rotation.z = side * 0.45
        mask.add(ear, stripe)
      }
      mask.add(mesh(new THREE.SphereGeometry(0.014, 12, 10), glowMat('#F5C451', 0.7), [0, 0.075, 0.058]))
      mask.position.set(...art(428, 166), FRONT_Z + 0.05)
      mask.rotation.set(-0.1, 0.4, -0.38)
      mask.scale.setScalar(1.4)
      g.add(mask)
      // Whisker marks on the cheeks.
      for (const cx of [200, 400]) {
        const o = cx < 300 ? -1 : 1
        for (const dy of [-10, 6]) {
          const w = mesh(roundBox(0.09, 0.016, 0.006), toy('#E11D48', 0.4, 0.3), [...art(cx + o * 6, 352 + dy), FRONT_Z + 0.006])
          w.rotation.z = o * (dy < 0 ? 0.18 : -0.12)
          g.add(w)
        }
      }
      // Two fox-fire wisps bobbing above the ears.
      const tex = flameTexture()
      for (const side of [-1, 1]) {
        const flame = sprite('#FF5CA8', 0.9, 0.18, 0.28, [side * 0.66, 2.78, 0], tex)
        const core = sprite('#FFFFFF', 0.9, 0.08, 0.12, [side * 0.66, 2.75, 0.01], tex)
        g.add(flame, core)
        fx.push((t) => {
          const y = 2.78 + Math.sin(t * 2 + side) * 0.04
          const k = 0.85 + 0.2 * Math.sin(t * 10 + side * 2)
          flame.position.y = y
          core.position.y = y - 0.03
          flame.scale.set(0.18, 0.28 * k, 1)
        })
      }
      return g
    }
    case 'mecha': {
      // A cyber helmet: dark armour, a glowing seam and V crest, side fins, a HUD lens over the right eye.
      const plate = armor()
      const teal = glowMat('#2DD4BF', 1.1)
      g.add(fittedCap(206, plate, 0.04, 0.06))
      const front = (HEAD.depth + 0.12) / 2 + 0.035
      g.add(mesh(roundBox(HEAD.w - 0.06, 0.024, 0.012), teal, [0, wy(206) + 0.035, front]))
      const v = new THREE.Shape()
      const at = (x: number, yy: number): [number, number] => [(x - 300) * S, (124 - yy) * S]
      v.moveTo(...at(300, 124))
      v.quadraticCurveTo(...at(244, 70), ...at(214, 22))
      v.quadraticCurveTo(...at(266, 60), ...at(300, 96))
      v.quadraticCurveTo(...at(334, 60), ...at(386, 22))
      v.quadraticCurveTo(...at(356, 70), ...at(300, 124))
      g.add(mesh(slab(v, 0.012, 0.008), teal, [0, wy(124), front - 0.01]))
      g.add(mesh(new THREE.OctahedronGeometry(0.035, 0), glowMat('#F472B6', 1.2), [0, wy(140), front + 0.01]))
      for (const side of [-1, 1]) {
        const fin = mesh(roundBox(0.07, 0.34, 0.24), plate, [side * (HEAD.w / 2 + 0.06), wy(250), -0.02])
        fin.rotation.z = side * 0.12
        const strip = mesh(roundBox(0.014, 0.24, 0.014), teal, [side * (HEAD.w / 2 + 0.1), wy(250), 0.04])
        strip.rotation.z = side * 0.12
        g.add(fin, strip)
      }
      const antenna = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 8), plate, [HEAD.w / 2 + 0.1, wy(170), -0.04])
      antenna.rotation.z = -0.25
      const blink = mesh(new THREE.SphereGeometry(0.028, 16, 12), glowMat('#F472B6', 1.4), [HEAD.w / 2 + 0.135, wy(130), -0.04])
      const blinkGlow = sprite('#F472B6', 0.7, 0.22, 0.22, [HEAD.w / 2 + 0.135, wy(130), -0.03])
      g.add(antenna, blink, blinkGlow)
      // The HUD lens: a see-through disc in a glowing ring, its tick marks turning.
      const lens = new THREE.Group()
      lens.position.set(...art(368, 304), FRONT_Z + 0.03)
      lens.add(mesh(new THREE.CircleGeometry(0.17, 40), holo('#5EEAD4', 0.18)))
      lens.add(mesh(new THREE.TorusGeometry(0.17, 0.012, 8, 64), teal))
      const ticks = new THREE.Group()
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        const tk = mesh(roundBox(0.012, i % 3 ? 0.03 : 0.05, 0.006), holo('#CCFBF1', 0.9), [Math.cos(a) * 0.205, Math.sin(a) * 0.205, 0])
        tk.rotation.z = a + Math.PI / 2
        ticks.add(tk)
      }
      const reticle = mesh(new THREE.TorusGeometry(0.05, 0.005, 6, 32), holo('#F472B6', 0.9))
      lens.add(ticks, reticle)
      const armBar = mesh(roundBox(0.24, 0.022, 0.016), plate, [0.25, 0.04, -0.01])
      armBar.rotation.z = 0.2
      lens.add(armBar)
      g.add(lens)
      fx.push((t) => {
        ticks.rotation.z = t * 0.8
        reticle.scale.setScalar(1 + 0.25 * Math.sin(t * 3))
        blinkGlow.visible = blink.visible = Math.sin(t * 4) > -0.2
      })
      return g
    }
    default:
      return null
  }
}

/** The item in the raised hand (hand at the origin, +y up the item) and where its effect glows: [y, w, h]. */
export function premiumHeld(gear: Gear, fx: Step[] = []): { group: THREE.Group; glowAt: [number, number, number] } | null {
  const g = new THREE.Group()
  switch (gear) {
    case 'frost': {
      // An ice scepter: a silver shaft with a snowflake crystal turning on top.
      const metal = silver()
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.86, 16), metal, [0, 0.2, 0]))
      g.add(mesh(new THREE.SphereGeometry(0.036, 16, 12), metal, [0, -0.24, 0]))
      for (const y of [-0.12, 0.3, 0.6]) {
        const ring = mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 24), metal, [0, y, 0])
        ring.rotation.x = Math.PI / 2
        g.add(ring)
      }
      const flake = new THREE.Group()
      flake.position.y = 0.8
      const arm = glowMat('#BAE6FD', 0.7)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const bar = mesh(roundBox(0.028, 0.2, 0.018), arm, [Math.sin(a) * 0.1, Math.cos(a) * 0.1, 0])
        bar.rotation.z = -a
        flake.add(bar)
        for (const turn of [-0.7, 0.7]) {
          const b = a + turn
          const twig = mesh(roundBox(0.018, 0.07, 0.014), arm, [Math.sin(a) * 0.14 + Math.sin(b) * 0.03, Math.cos(a) * 0.14 + Math.cos(b) * 0.03, 0])
          twig.rotation.z = -b
          flake.add(twig)
        }
      }
      flake.add(crystal(0.05, 0.12, glowMat('#E0F2FE', 1.1), [0, 0, 0.01]))
      const shine = sprite('#7DD3FC', 0.6, 0.55, 0.55, [0, 0.8, 0.02])
      g.add(flake, shine)
      fx.push((t) => {
        flake.rotation.z = t * 0.6
        shine.material.opacity = 0.45 + 0.2 * Math.sin(t * 2.4)
      })
      return { group: g, glowAt: [0.8, 0.5, 0.5] }
    }
    case 'kitsune': {
      // A shrine bell wand: tiers of little gold bells, long ribbons swaying, a fox-fire on top.
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 16), toy('#C81E4A', 0.22, 0.9), [0, 0.2, 0]))
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16), gold(), [0, 0.56, 0]))
      g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 8), gold(), [0, 0.72, 0]))
      const bell = gold()
      for (const [y, n, rad] of [[0.62, 7, 0.11], [0.71, 5, 0.08], [0.79, 3, 0.05]] as const)
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2
          g.add(mesh(new THREE.SphereGeometry(0.026, 14, 10), bell, [Math.sin(a) * rad, y, Math.cos(a) * rad * 0.6]))
        }
      g.add(mesh(new THREE.SphereGeometry(0.03, 14, 10), bell, [0, 0.87, 0]))
      for (const [i, color] of ['#FF5CA8', '#FFFFFF', '#8B5CF6'].entries()) {
        const pivot = new THREE.Group()
        pivot.position.set(0, 0.55, 0.02 + i * 0.006)
        pivot.add(mesh(roundBox(0.036, 0.42, 0.006), satin(color), [0, -0.21, 0]))
        g.add(pivot)
        fx.push((t) => (pivot.rotation.z = (i - 1) * 0.28 + Math.sin(t * 2.4 + i * 1.3) * 0.12))
      }
      const tex = flameTexture()
      const flame = sprite('#FF5CA8', 0.95, 0.2, 0.32, [0, 1.0, 0.02], tex)
      const core = sprite('#FFFFFF', 0.95, 0.09, 0.14, [0, 0.97, 0.03], tex)
      g.add(flame, core, sprite('#FF5CA8', 0.4, 0.5, 0.5, [0, 0.95, 0]))
      fx.push((t) => flame.scale.set(0.2, 0.32 * (0.85 + 0.2 * Math.sin(t * 11)), 1))
      return { group: g, glowAt: [0.72, 0.5, 0.5] }
    }
    case 'mecha': {
      // A plasma katana: wrapped hilt, hex guard, a white-hot blade in a teal glow, flickering.
      const plate = armor()
      g.add(mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.26, 16), plate, [0, -0.03, 0]))
      for (const y of [-0.12, -0.06, 0, 0.06]) {
        const ring = mesh(new THREE.TorusGeometry(0.026, 0.006, 6, 20), glowMat('#2DD4BF', 1), [0, y, 0])
        ring.rotation.x = Math.PI / 2
        g.add(ring)
      }
      const guard = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.024, 6), plate, [0, 0.11, 0])
      const guardRim = mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 6), glowMat('#2DD4BF', 1.1), [0, 0.11, 0])
      guardRim.rotation.x = Math.PI / 2
      g.add(guard, guardRim)
      const core = mesh(roundBox(0.026, 0.78, 0.01), glowMat('#ECFEFF', 1.8), [0, 0.52, 0])
      const sheath = mesh(roundBox(0.05, 0.8, 0.022), holo('#2DD4BF', 0.5), [0, 0.52, 0])
      const tip = mesh(new THREE.ConeGeometry(0.025, 0.08, 4), glowMat('#ECFEFF', 1.8), [0, 0.95, 0])
      tip.scale.z = 0.4
      const aura = sprite('#2DD4BF', 0.55, 0.3, 1.05, [0, 0.52, 0.02])
      g.add(sheath, core, tip, aura)
      fx.push((t) => {
        const k = 0.85 + 0.1 * Math.sin(t * 23) + 0.05 * Math.sin(t * 37)
        aura.material.opacity = 0.55 * k
        sheath.scale.x = k
      })
      return { group: g, glowAt: [0.52, 0.24, 0.9] }
    }
    default:
      return null
  }
}

/** Left-hand items (local origin is the hand): Neon Ronin's drone. */
export function premiumOffhand(gear: Gear, fx: Step[] = []): THREE.Group | null {
  if (gear !== 'mecha') return null
  const g = new THREE.Group()
  const drone = new THREE.Group()
  const shell = mesh(new THREE.SphereGeometry(0.09, 28, 18), armor())
  shell.scale.y = 0.75
  const eye = mesh(new THREE.SphereGeometry(0.03, 16, 12), glowMat('#2DD4BF', 1.4), [0, 0, 0.075])
  eye.scale.z = 0.5
  const belt = mesh(new THREE.TorusGeometry(0.092, 0.006, 6, 40), glowMat('#2DD4BF', 1))
  belt.rotation.x = Math.PI / 2
  drone.add(shell, eye, belt, mesh(roundBox(0.28, 0.016, 0.02), armor(), [0, 0.07, 0]))
  const rotors: THREE.Mesh[] = []
  for (const side of [-1, 1]) {
    const rotor = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.004, 3), holo('#99F6E4', 0.5), [side * 0.14, 0.085, 0])
    rotors.push(rotor)
    drone.add(rotor)
  }
  drone.add(sprite('#2DD4BF', 0.4, 0.3, 0.3, [0, 0, 0.08]))
  drone.position.set(0, 0.3, 0.14)
  g.add(drone)
  fx.push((t) => {
    drone.position.y = 0.3 + Math.sin(t * 2.2) * 0.035
    drone.rotation.z = Math.sin(t * 1.4) * 0.12
    for (const r of rotors) r.rotation.y = t * 30
  })
  return g
}

/** Robes, kimono and armour around the handle (radius `r`). */
export function premiumBody(gear: Gear, r: number, g: THREE.Group) {
  const at = (y: number) => wy(y)
  const tube = (top: number, bottom: number, material: THREE.Material, grow = 0.03, flare = 0.03) =>
    g.add(mesh(new THREE.CylinderGeometry(r + grow, r + grow + flare, (bottom - top) * S, 32), material, [0, at((top + bottom) / 2), 0]))
  const band = (y: number, h: number, material: THREE.Material, grow = 0.045) =>
    g.add(mesh(new THREE.CylinderGeometry(r + grow, r + grow, h * S, 32), material, [0, at(y), 0]))
  switch (gear) {
    case 'frost': {
      tube(504, 690, toy('#F1F7FD', 0.45, 0.4), 0.04, 0.12)
      const fur = mesh(new THREE.TorusGeometry(1, 0.07, 16, 48), toy('#FFFFFF', 0.9, 0), [0, at(500), 0])
      fur.rotation.x = Math.PI / 2
      fur.scale.set(r + 0.12, r + 0.1, 1)
      g.add(fur)
      band(588, 14, silver(), 0.065)
      // Ice gems down the front of the robe, following its flare.
      for (const y of [540, 588, 636]) {
        const z = r + 0.04 + (0.12 * (y - 504)) / 186 + 0.03
        const gem = mesh(new THREE.OctahedronGeometry(0.035, 0), glowMat('#7DD3FC', 0.9), [0, at(y), z])
        gem.scale.set(1, 1.3, 0.6)
        g.add(gem)
      }
      break
    }
    case 'kitsune': {
      tube(504, 596, toy('#FFFFFF', 0.5, 0.3), 0.03, 0.02)
      for (const side of [-1, 1]) {
        const s = mesh(roundBox(0.035, 0.2, 0.02), satin('#C81E4A'), [side * 0.045, at(524), r + 0.045])
        s.rotation.z = side * 0.5
        g.add(s)
      }
      tube(590, 690, satin('#C81E4A'), 0.05, 0.13)
      // A twisted rope belt with paper zigzags hanging from the front.
      const rope = mesh(new THREE.TorusGeometry(r + 0.075, 0.024, 10, 48), toy('#F5E6C8', 0.6, 0.2), [0, at(592), 0])
      rope.rotation.x = Math.PI / 2
      g.add(rope, mesh(new THREE.SphereGeometry(0.04, 16, 12), toy('#F5E6C8', 0.6, 0.2), [0, at(592), r + 0.1]))
      for (const side of [-1, 1]) g.add(mesh(slab(zigzag(0.2), 0.006, 0.002), toy('#FFFFFF', 0.5, 0.3), [side * 0.07 - 0.02, at(600), r + 0.11]))
      break
    }
    case 'mecha': {
      const plate = armor()
      const teal = glowMat('#2DD4BF', 1)
      tube(504, 612, plate, 0.035, 0.02)
      for (const side of [-1, 1]) {
        const pad = mesh(roundBox(0.22, 0.08, 0.26), plate, [side * (r + 0.1), at(492), 0])
        pad.rotation.z = side * -0.35
        const edge = mesh(roundBox(0.2, 0.012, 0.012), teal, [side * (r + 0.1), at(492) - 0.035, 0.13])
        edge.rotation.z = side * -0.35
        g.add(pad, edge)
        // Circuit lines down the chest.
        g.add(mesh(roundBox(0.012, 0.2, 0.008), teal, [side * 0.06, at(572), r + 0.04]))
        g.add(mesh(roundBox(0.04, 0.012, 0.008), teal, [side * 0.04, at(600), r + 0.04]))
      }
      const reactor = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 32), glowMat('#F472B6', 1.4), [0, at(536), r + 0.05])
      reactor.rotation.x = Math.PI / 2
      const ring = mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 32), teal, [0, at(536), r + 0.055])
      g.add(reactor, ring)
      band(604, 14, plate)
      g.add(mesh(roundBox(0.08, 0.05, 0.02), teal, [0, at(604), r + 0.055]))
      break
    }
  }
}

/** A fox tail along a rising curve: thin at the root, full in the middle, a pointed tip dipped in `tip` colour. */
function foxTail(length: number, girth: number, bend: number, tip: string) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(bend * 0.06, length * 0.35, -0.03),
    new THREE.Vector3(bend * 0.22, length * 0.72, -0.06),
    new THREE.Vector3(bend * 0.08, length, -0.05),
  ])
  const tubular = 40
  const radial = 14
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const base = new THREE.Color('#FFF7F2')
  const end = new THREE.Color(tip)
  const c = new THREE.Color()
  const centre = new THREE.Vector3()
  const d = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    const k = Math.floor(i / (radial + 1)) / tubular
    curve.getPointAt(Math.min(1, k), centre)
    const rad = girth * Math.sin(Math.PI * (0.12 + 0.88 * k ** 1.3)) ** 0.7 + 0.004
    d.fromBufferAttribute(pos, i).sub(centre)
    d.multiplyScalar(rad / Math.max(d.length(), 1e-6))
    pos.setXYZ(i, centre.x + d.x, centre.y + d.y, centre.z + d.z)
    c.copy(base).lerp(end, THREE.MathUtils.smoothstep(k, 0.68, 0.94))
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  const material = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.65, sheen: 1, sheenColor: new THREE.Color('#FFE4F1'), sheenRoughness: 0.4, emissive: '#3A0A20', emissiveIntensity: 0.12 })
  return new THREE.Mesh(geo, material)
}

/** Each skin's backdrop, drawn behind the character with the premium glow. `steps` animate it. */
export function premiumBackdrop(gear: Gear, g: THREE.Group, steps: Step[]) {
  switch (gear) {
    case 'frost': {
      // Aurora curtains rippling across the sky, snowflakes drifting down, ice crystals around the feet.
      const curtain = curtainTexture()
      for (const [i, [color, y, amp, speed]] of ([['#5EEAD4', 2.55, 0.16, 0.7], ['#7DD3FC', 2.2, 0.2, 0.55], ['#A78BFA', 1.85, 0.14, 0.85]] as const).entries()) {
        const geo = new THREE.PlaneGeometry(3.4, 0.75, 48, 1)
        const rest = Float32Array.from(geo.attributes.position.array as Float32Array)
        const ribbon = new THREE.Mesh(geo, holo(color, 0.4, curtain))
        ribbon.position.set(0, y, -0.95 - i * 0.05)
        g.add(ribbon)
        steps.push((t) => {
          const p = geo.attributes.position as THREE.BufferAttribute
          for (let k = 0; k < p.count; k++) p.setY(k, rest[k * 3 + 1] + Math.sin(rest[k * 3] * 1.6 + t * speed * 2 + i * 1.7) * amp)
          p.needsUpdate = true
          ;(ribbon.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.14 * Math.sin(t * 0.9 + i * 2)
        })
      }
      const flakeTex = snowflakeTexture()
      for (let i = 0; i < 16; i++) {
        const size = 0.07 + ((i * 7) % 5) * 0.025
        const x0 = Math.sin(i * 12.9) * 1.35
        const z = -0.6 + ((i * 0.37) % 1) * 1.1
        const flake = sprite('#FFFFFF', 0.9, size, size, [x0, 3, z], flakeTex)
        g.add(flake)
        const speed = 0.08 + ((i * 0.13) % 1) * 0.06
        const offset = (i * 0.618) % 1
        steps.push((t) => {
          const k = (t * speed + offset) % 1
          flake.position.set(x0 + Math.sin(t * 0.9 + i) * 0.12, 3.1 - k * 3.1, z)
          flake.material.rotation = t * (i % 2 ? 0.8 : -0.6)
          flake.material.opacity = 0.9 * Math.min(1, (1 - k) * 4, k * 8)
        })
      }
      const iceMat = ice(0.78)
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.35
        const h = 0.22 + ((i * 37) % 5) * 0.06
        const c = crystal(0.07, h, iceMat, [Math.cos(a) * 0.9, h * 0.22, Math.sin(a) * 0.55 - 0.12])
        c.rotation.z = -Math.cos(a) * 0.35
        c.rotation.x = Math.sin(a) * 0.3
        g.add(c)
      }
      const frost = sprite('#BAE6FD', 0.45, 2.6, 0.7, [0, 0.1, 0.05])
      g.add(frost)
      steps.push((t) => (frost.material.opacity = 0.35 + 0.12 * Math.sin(t * 1.5)))
      break
    }
    case 'kitsune': {
      // Nine fox tails fanning out behind, swaying; fox-fire circling; a spirit circle on the ground.
      const tails = new THREE.Group()
      tails.position.set(0, wy(612), -0.3)
      for (let i = 0; i < 9; i++) {
        const k = i / 8 - 0.5 // -0.5 .. 0.5, left to right
        const pivot = new THREE.Group()
        pivot.position.z = -Math.abs(k) * 0.08 - (0.5 - Math.abs(k)) * 0.22
        const tail = foxTail(1.3 - Math.abs(k) * 0.25, 0.14, k < 0 ? -1 : 1, '#FF6FA8')
        pivot.add(tail)
        tails.add(pivot)
        const angle = -k * 2.6
        steps.push((t) => {
          pivot.rotation.z = angle + Math.sin(t * 1.5 + i * 0.7) * 0.07
          pivot.rotation.x = -0.25 + Math.sin(t * 1.1 + i) * 0.05
        })
      }
      tails.add(mesh(new THREE.SphereGeometry(0.12, 24, 16), toy('#FFF7F2', 0.65, 0.2)))
      g.add(tails)
      const ring = new THREE.Group()
      ring.position.y = 1.25
      const tex = flameTexture()
      const fires: { flame: THREE.Sprite; core: THREE.Sprite; a: number }[] = []
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const flame = sprite(i % 2 ? '#FF5CA8' : '#C084FC', 0.95, 0.2, 0.32, [0, 0, 0], tex)
        const core = sprite('#FFFFFF', 0.9, 0.08, 0.13, [0, 0, 0], tex)
        ring.add(flame, core)
        fires.push({ flame, core, a })
      }
      g.add(ring)
      steps.push((t) => {
        for (const [i, f] of fires.entries()) {
          const a = f.a + t * 0.5
          const y = Math.sin(t * 1.8 + i * 1.1) * 0.45
          f.flame.position.set(Math.cos(a) * 1.15, y, Math.sin(a) * 0.9)
          f.core.position.set(Math.cos(a) * 1.15, y - 0.03, Math.sin(a) * 0.9 + 0.01)
          f.flame.scale.set(0.2, 0.32 * (0.85 + 0.2 * Math.sin(t * 10 + i)), 1)
        }
      })
      const circle = mesh(new THREE.TorusGeometry(0.85, 0.012, 8, 96), glowMat('#FF5CA8', 1), [0, 0.015, 0])
      circle.rotation.x = Math.PI / 2
      const dashes = new THREE.Group()
      dashes.position.y = 0.018
      const dashMat = holo('#FBCFE8', 0.8)
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2
        const dsh = mesh(new THREE.PlaneGeometry(0.1, 0.022), dashMat, [Math.cos(a) * 0.68, 0, Math.sin(a) * 0.68])
        dsh.rotation.set(-Math.PI / 2, 0, -a + Math.PI / 2)
        dashes.add(dsh)
      }
      g.add(circle, dashes, sprite('#FF5CA8', 0.35, 2.3, 0.6, [0, 0.1, 0.05]))
      steps.push((t) => (dashes.rotation.y = -t * 0.4))
      break
    }
    case 'mecha': {
      // Holographic rings turning behind, data streaks falling, a scan pulse sweeping out across the floor.
      const rings = new THREE.Group()
      rings.position.set(0, 1.45, -0.85)
      const arcs = (radius: number, n: number, fill: number, color: string, opacity: number) => {
        const r = new THREE.Group()
        for (let i = 0; i < n; i++) {
          const arc = mesh(new THREE.TorusGeometry(radius, 0.014, 6, 48, ((Math.PI * 2) / n) * fill), holo(color, opacity))
          arc.rotation.z = (i / n) * Math.PI * 2
          r.add(arc)
        }
        rings.add(r)
        return r
      }
      const outer = arcs(1.15, 6, 0.72, '#2DD4BF', 0.75)
      const inner = arcs(0.9, 4, 0.58, '#F472B6', 0.7)
      const ticks = new THREE.Group()
      const tickMat = holo('#5EEAD4', 0.45)
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2
        const tk = mesh(new THREE.PlaneGeometry(0.012, i % 4 ? 0.04 : 0.08), tickMat, [Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0])
        tk.rotation.z = a + Math.PI / 2
        ticks.add(tk)
      }
      rings.add(ticks)
      g.add(rings)
      steps.push((t) => {
        outer.rotation.z = t * 0.35
        inner.rotation.z = -t * 0.5
        ticks.rotation.z = t * 0.08
      })
      const streak = curtainTexture()
      for (let i = 0; i < 14; i++) {
        const x = -1.45 + (i / 13) * 2.9 + Math.sin(i * 4.1) * 0.06
        const z = -0.7 - ((i * 0.41) % 1) * 0.3
        const s = mesh(new THREE.PlaneGeometry(0.018, 0.55), holo(i % 3 ? '#2DD4BF' : '#F472B6', 0.7, streak), [x, 3, z])
        s.rotation.z = Math.PI // bright end leading downward
        g.add(s)
        const speed = 0.25 + ((i * 0.29) % 1) * 0.25
        const offset = (i * 0.618) % 1
        steps.push((t) => {
          const k = (t * speed + offset) % 1
          s.position.y = 3.2 - k * 3.2
          ;(s.material as THREE.MeshBasicMaterial).opacity = 0.7 * Math.min(1, (1 - k) * 5)
        })
      }
      const base = mesh(new THREE.TorusGeometry(0.75, 0.01, 6, 96), holo('#2DD4BF', 0.8), [0, 0.015, 0])
      base.rotation.x = Math.PI / 2
      const scan = mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), holo('#5EEAD4', 0.8), [0, 0.02, 0])
      scan.rotation.x = Math.PI / 2
      g.add(base, scan)
      const reactor = sprite('#F472B6', 0.6, 0.35, 0.35, [0, wy(536), 0.24])
      g.add(reactor)
      steps.push((t) => {
        const k = (t * 0.5) % 1
        scan.scale.setScalar(0.3 + k * 1.1)
        ;(scan.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k)
        reactor.material.opacity = 0.4 + 0.3 * Math.sin(t * 3.2)
      })
      break
    }
  }
}
