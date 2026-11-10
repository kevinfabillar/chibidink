import * as THREE from 'three'
import type { Gear } from '../cosmetics/visuals'
import { FRONT_Z, HEAD, S, art, fittedCap, gold, roundBox, roundedRect, satin, slab, steel, wy } from './gear'
import { mesh, toy } from './materials'
import { glowTexture } from './textures'

// The achievement skins (earned with 50 kudos of one kind) in 3D, matching
// components/character/achievementArt.tsx: Grand Maître (Serves), Aegis Bastion (Defense),
// F1 Champion (Drives), Sword God (Slices) and Clockwork Rewind (Resets).

export const ACHIEVEMENT_GEARS: Gear[] = ['butler', 'aegis', 'racer', 'shade', 'clockwork']

const glossy = (color: string) => toy(color, 0.28, 0.8)
const glowMat = (color: string, intensity = 0.8) =>
  new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.25, clearcoat: 1 })
const brass = () => new THREE.MeshPhysicalMaterial({ color: '#C8943A', metalness: 0.85, roughness: 0.32 })
const silver = () => new THREE.MeshPhysicalMaterial({ color: '#E3E8EF', metalness: 0.95, roughness: 0.12 })
const glass = (color: string, opacity = 0.55) =>
  new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.05, metalness: 0.2, clearcoat: 1, depthWrite: false })

/** A flat face-on sprite glow (additive). */
function glow(color: string, opacity: number, w: number, h: number, at: [number, number, number]) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ color, map: glowTexture(), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  s.scale.set(w, h, 1)
  s.position.set(...at)
  return s
}

/** A cog outline with `teeth` teeth and a hole in the middle. */
function cogShape(outer: number, inner: number, teeth: number, hole: number) {
  const s = new THREE.Shape()
  const steps = teeth * 4
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const r = i % 4 < 2 ? outer : inner
    const p: [number, number] = [Math.cos(t) * r, Math.sin(t) * r]
    if (i === 0) s.moveTo(...p)
    else s.lineTo(...p)
  }
  const h = new THREE.Path()
  h.absarc(0, 0, hole, 0, Math.PI * 2, true)
  s.holes.push(h)
  return s
}

function cog(outer: number, teeth: number, material: THREE.Material, depth = 0.03) {
  return mesh(slab(cogShape(outer, outer * 0.82, teeth, outer * 0.32), depth, 0.006), material)
}

/** A canvas texture with text, for the racer's "01". */
function textTexture(text: string, color: string, bg: string) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const ctx = c.getContext('2d')!
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 128, 64)
  ctx.fillStyle = color
  ctx.font = 'bold 46px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 36)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** A checkerboard texture (racing flags and trim). */
function checkerTexture(n = 6) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const k = 64 / n
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    ctx.fillStyle = (x + y) % 2 ? '#111317' : '#F4F6F9'
    ctx.fillRect(x * k, y * k, k, k)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.NearestFilter
  return t
}

/**
 * A slice of the (grown) head between two heights in design units, extruded like fittedCap: the racer's
 * chin guard is the part below the visor.
 */
function headSlice(fromY: number, toY: number, material: THREE.Material, grow: number, depthGrow: number) {
  const outline = roundedRect(HEAD.w + grow * 2, HEAD.h + grow * 2, HEAD.r + grow).getSpacedPoints(240)
  const top = wy(fromY) - HEAD.y
  const bottom = wy(toY) - HEAD.y
  // Clip the outline polygon to bottom <= y <= top, one edge at a time.
  const clip = (pts: THREE.Vector2[], keep: (p: THREE.Vector2) => boolean, at: number) => {
    const out: THREE.Vector2[] = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      if (keep(a)) out.push(a)
      if (keep(a) !== keep(b)) out.push(new THREE.Vector2(a.x + ((at - a.y) / (b.y - a.y)) * (b.x - a.x), at))
    }
    return out
  }
  const kept = clip(clip(outline, (p) => p.y <= top, top), (p) => p.y >= bottom, bottom)
  const depth = HEAD.depth + depthGrow * 2
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(kept), { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 6, curveSegments: 12 })
  geo.translate(0, HEAD.y, -depth / 2)
  return new THREE.Mesh(geo, material)
}

/** Hats, helmets and the bits worn on the face (monocle, mustache, visor, goggles). */
/** `fx` collects per-frame updates for animated pieces (the Aegis helmet's energy). */
export function achHat(gear: Gear, fx: ((t: number) => void)[] = []): THREE.Group | null {
  const g = new THREE.Group()
  switch (gear) {
    case 'butler': {
      const black = glossy('#15171C')
      const hat = new THREE.Group()
      hat.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 48), black)) // brim
      hat.add(mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.42, 48), black, [0, 0.23, 0])) // crown
      hat.add(mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.07, 48), satin('#9E1B2B'), [0, 0.07, 0])) // band
      hat.add(mesh(roundBox(0.09, 0.07, 0.03), gold(), [0, 0.07, 0.31]))
      hat.position.set(...art(312, 86), 0)
      hat.rotation.set(-0.08, 0, -0.1)
      g.add(hat)
      // Monocle on the right eye, with its chain.
      const ring = mesh(new THREE.TorusGeometry(0.135, 0.018, 16, 48), gold(), [...art(368, 304), FRONT_Z + 0.025])
      const lens = mesh(new THREE.CircleGeometry(0.125, 40), glass('#FFF7D6', 0.28), [...art(368, 304), FRONT_Z + 0.022])
      const chain = new THREE.CatmullRomCurve3([
        new THREE.Vector3(...art(400, 330), FRONT_Z + 0.02),
        new THREE.Vector3(...art(430, 380), FRONT_Z + 0.01),
        new THREE.Vector3(...art(452, 440), FRONT_Z - 0.04),
      ])
      g.add(ring, lens, mesh(new THREE.TubeGeometry(chain, 24, 0.006, 6, false), gold()))
      // A curled mustache under the nose.
      const tache = satin('#3B2416')
      for (const side of [-1, 1]) {
        const curl = new THREE.CatmullRomCurve3([
          new THREE.Vector3(...art(300, 348), FRONT_Z + 0.02),
          new THREE.Vector3(...art(300 + side * 40, 358), FRONT_Z + 0.025),
          new THREE.Vector3(...art(300 + side * 72, 344), FRONT_Z + 0.02),
          new THREE.Vector3(...art(300 + side * 80, 326), FRONT_Z + 0.015),
        ])
        g.add(mesh(new THREE.TubeGeometry(curl, 32, 0.028, 10, false), tache))
      }
      return g
    }
    case 'aegis': {
      const metal = steel()
      g.add(fittedCap(250, metal, 0.05, 0.07)) // dome over the head
      for (const side of [-1, 1]) {
        const cheek = mesh(roundBox(0.12, 0.62, 0.34), metal, [side * (HEAD.w / 2 + 0.02), wy(330), 0])
        g.add(cheek)
      }
      g.add(mesh(roundBox(HEAD.w + 0.12, 0.07, 0.36), gold(), [0, wy(250), 0])) // gold brow trim
      // Turret crest on top and a blue shield emblem on the brow.
      for (const x of [-0.2, 0, 0.2]) g.add(mesh(roundBox(0.12, 0.14, 0.12), metal, [x, wy(56), 0]))
      const crest = new THREE.Shape()
      crest.moveTo(-0.07, 0.07)
      crest.lineTo(0.07, 0.07)
      crest.lineTo(0.07, -0.01)
      crest.quadraticCurveTo(0.06, -0.06, 0, -0.09)
      crest.quadraticCurveTo(-0.06, -0.06, -0.07, -0.01)
      crest.closePath()
      g.add(mesh(slab(crest, 0.02, 0.008), toy('#2B4FA0', 0.3, 0.7), [0, wy(160), FRONT_Z + 0.07]))
      // Energy: a glowing band across the brow, the crest gem pulsing, a soft blue plume above.
      const energy = glowMat('#38BDF8', 0.9)
      const band = mesh(roundBox(HEAD.w + 0.1, 0.018, 0.02), energy, [0, wy(262), FRONT_Z + 0.075])
      const crestGem = mesh(new THREE.OctahedronGeometry(0.03, 0), glowMat('#E0F2FE', 1.2), [0, wy(160), FRONT_Z + 0.1])
      const plume = glow('#38BDF8', 0.5, 0.5, 0.7, [0, wy(20), -0.02])
      const halo = glow('#7DD3FC', 0.5, 0.36, 0.36, [0, wy(160), FRONT_Z + 0.12])
      g.add(band, crestGem, plume, halo)
      fx.push((t) => {
        const k = 0.5 + 0.5 * Math.sin(t * 2.4)
        energy.emissiveIntensity = 0.5 + 0.9 * k
        crestGem.scale.setScalar(0.85 + 0.3 * k)
        halo.material.opacity = 0.3 + 0.5 * k
        plume.material.opacity = 0.3 + 0.3 * Math.sin(t * 1.7 + 1)
        plume.scale.set(0.5, 0.6 + 0.15 * Math.sin(t * 2.1), 1)
      })
      return g
    }
    case 'racer': {
      // A full-face race helmet: glossy shell over the top, a chin guard below, the eyes behind a tinted
      // visor in a gold frame. A gold halo floats above it.
      const GROW = 0.07
      const DEPTH_GROW = 0.08
      const shellFront = (HEAD.depth + DEPTH_GROW * 2) / 2 + 0.03 // where the shell's front surface is
      const red = new THREE.MeshPhysicalMaterial({ color: '#D61F2C', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 })
      const VISOR_TOP = 228
      const VISOR_BOTTOM = 352
      g.add(fittedCap(VISOR_TOP, red, GROW, DEPTH_GROW))
      g.add(headSlice(VISOR_BOTTOM, 560, red, GROW, DEPTH_GROW))
      // The visor: tinted glass, set in a gold frame, with two reflection streaks.
      const visorW = HEAD.w + GROW * 2 - 0.02
      const visorH = (VISOR_BOTTOM - VISOR_TOP) * S + 0.02
      const visorY = wy((VISOR_TOP + VISOR_BOTTOM) / 2)
      g.add(mesh(slab(roundedRect(visorW, visorH, 0.07), 0.02, 0.006), glass('#FB923C', 0.78), [0, visorY, shellFront - 0.05]))
      const frame = new THREE.CatmullRomCurve3(
        roundedRect(visorW + 0.02, visorH + 0.02, 0.08).getSpacedPoints(80).map((p) => new THREE.Vector3(p.x, p.y + visorY, shellFront - 0.005)),
        true,
      )
      g.add(mesh(new THREE.TubeGeometry(frame, 160, 0.016, 8, true), gold()))
      const shine = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.55 })
      for (const [x, w] of [[-0.2, 0.05], [-0.1, 0.025], [0.22, 0.04]] as const) {
        const streak = mesh(roundBox(w, visorH * 0.9, 0.005), shine, [x, visorY, shellFront - 0.02])
        streak.rotation.z = -0.55
        g.add(streak)
      }
      // White racing stripe over the top, front to back.
      const white = toy('#F4F6F9', 0.25, 0.8)
      g.add(mesh(roundBox(0.07, (VISOR_TOP - 76) * S, 0.012), white, [0, wy((VISOR_TOP + 76) / 2), shellFront + 0.004]))
      g.add(mesh(roundBox(0.07, 0.012, HEAD.depth + DEPTH_GROW * 2 + 0.04), white, [0, wy(80 - GROW / S) + 0.012, 0]))
      // Checkered panels on the sides, a rear spoiler, chin vents and the "01" plate.
      const checker = new THREE.MeshStandardMaterial({ map: checkerTexture(6), roughness: 0.4 })
      for (const side of [-1, 1]) {
        const panel = mesh(new THREE.PlaneGeometry(0.26, 0.22), checker, [side * (HEAD.w / 2 + GROW + 0.025), wy(292), 0])
        panel.rotation.y = (side * Math.PI) / 2
        g.add(panel)
      }
      const spoiler = new THREE.Group()
      spoiler.add(mesh(roundBox(0.46, 0.025, 0.1), glossy('#15171C'), [0, 0.07, 0]))
      for (const x of [-0.12, 0.12]) spoiler.add(mesh(roundBox(0.025, 0.07, 0.03), glossy('#15171C'), [x, 0.035, 0]))
      spoiler.position.set(0, wy(80 - GROW / S), -(HEAD.depth / 2 + DEPTH_GROW - 0.02))
      g.add(spoiler)
      for (const x of [-0.06, 0, 0.06]) g.add(mesh(roundBox(0.035, 0.06, 0.012), glossy('#15171C'), [x, wy(392), shellFront + 0.004]))
      g.add(mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshStandardMaterial({ map: textTexture('01', '#3B2A06', '#E7B93F'), roughness: 0.35, metalness: 0.5 }), [0, wy(448), shellFront + 0.006]))
      // The gold halo floating above.
      const halo = mesh(new THREE.TorusGeometry(0.3, 0.028, 16, 64), glowMat('#F5C451', 0.55), [0, wy(80 - GROW / S) + 0.22, 0])
      halo.rotation.x = Math.PI / 2.4
      g.add(halo, glow('#FDE68A', 0.45, 0.8, 0.3, [0, wy(80 - GROW / S) + 0.22, 0]))
      return g
    }
    case 'shade': {
      // A crowned headband: gold-trimmed band, five violet spikes with gems, blade fins sweeping back.
      const ring = (y: number, tube: number, m: THREE.Material) => {
        const t = mesh(new THREE.TorusGeometry(1, tube, 12, 64), m, [0, wy(y), 0])
        t.rotation.x = Math.PI / 2
        t.scale.set(HEAD.w / 2 + 0.04, HEAD.depth / 2 + 0.09, 1)
        return t
      }
      g.add(ring(205, 0.055, satin('#14101F')), ring(182, 0.014, gold()), ring(228, 0.014, gold()))
      const violet = glowMat('#8B5CF6', 0.7)
      const spikes: [number, number, number][] = [[-0.3, 0.16, 0.5], [-0.16, 0.26, 0.25], [0, 0.42, 0], [0.16, 0.26, -0.25], [0.3, 0.16, -0.5]]
      for (const [x, h, tilt] of spikes) {
        const spike = mesh(new THREE.ConeGeometry(0.055, h, 4), violet, [x, wy(182) + h / 2, FRONT_Z - 0.01])
        spike.rotation.z = tilt
        g.add(spike, mesh(new THREE.OctahedronGeometry(0.02, 0), glowMat('#EDE9FE', 1.2), [x, wy(184), FRONT_Z + 0.05]))
      }
      for (const side of [-1, 1]) {
        const fin = new THREE.Shape()
        fin.moveTo(0, 0)
        fin.lineTo(0.3, 0.16)
        fin.lineTo(0.08, -0.03)
        fin.closePath()
        const f = mesh(slab(fin, 0.012, 0.004), glowMat('#A78BFA', 0.6), [side * (HEAD.w / 2 + 0.02), wy(205), -0.02])
        f.scale.x = side
        f.rotation.y = side * -0.6
        g.add(f)
      }
      const gem = mesh(new THREE.OctahedronGeometry(0.075, 0), glowMat('#C4B5FD', 1.3), [0, wy(205), FRONT_Z + 0.07])
      gem.scale.set(0.8, 1.25, 0.5)
      g.add(gem, glow('#8B5CF6', 0.85, 0.42, 0.42, [0, wy(205), FRONT_Z + 0.09]))
      return g
    }
    case 'clockwork': {
      const leather = satin('#3B2A1A')
      const hat = new THREE.Group()
      hat.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.035, 48), leather))
      hat.add(mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.3, 48), leather, [0, 0.17, 0]))
      hat.add(mesh(new THREE.CylinderGeometry(0.295, 0.295, 0.06, 48), brass(), [0, 0.05, 0]))
      const c = cog(0.1, 10, brass(), 0.025)
      c.position.set(0.18, 0.18, 0.24)
      c.rotation.y = 0.6
      hat.add(c)
      hat.position.set(...art(306, 88), 0)
      hat.rotation.z = -0.08
      g.add(hat)
      // Brass goggles resting on the brow.
      for (const cx of [236, 364]) {
        g.add(mesh(new THREE.TorusGeometry(0.1, 0.03, 12, 40), brass(), [...art(cx, 190), FRONT_Z + 0.04]))
        g.add(mesh(new THREE.CircleGeometry(0.09, 32), glass('#F59E0B', 0.7), [...art(cx, 190), FRONT_Z + 0.035]))
      }
      g.add(mesh(roundBox(0.14, 0.03, 0.03), brass(), [0, wy(190), FRONT_Z + 0.04]))
      const strap = mesh(new THREE.TorusGeometry(1, 0.022, 8, 64), leather, [0, wy(190), 0])
      strap.rotation.x = Math.PI / 2
      strap.scale.set(HEAD.w / 2 + 0.02, HEAD.depth / 2 + 0.06, 1)
      g.add(strap)
      return g
    }
    default:
      return null
  }
}

/** The item in the raised hand (hand at the origin, +y up the item) and where its effect glows: [y, w, h]. */
export function achHeld(gear: Gear): { group: THREE.Group; glowAt: [number, number, number] } | null {
  const g = new THREE.Group()
  switch (gear) {
    case 'butler': {
      // A silver cloche on a tray, steam rising.
      g.add(mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.025, 48), silver(), [0, 0.06, 0]))
      const dome = mesh(new THREE.SphereGeometry(0.2, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), silver(), [0, 0.075, 0])
      dome.scale.y = 0.85
      g.add(dome, mesh(new THREE.SphereGeometry(0.035, 20, 14), silver(), [0, 0.26, 0]))
      for (const [x, i] of [[-0.06, 0], [0.04, 1], [0.12, 2]] as const) g.add(glow('#FFFFFF', 0.35 - i * 0.05, 0.1, 0.28, [x, 0.42 + i * 0.03, 0]))
      g.rotation.z = 0.35 // level the tray in the raised hand
      return { group: g, glowAt: [0.18, 0.5, 0.36] }
    }
    case 'aegis': {
      // A glowing hex crystal floating above the hand, with a smaller one beside it.
      const blue = glowMat('#60A5FA', 0.7)
      const big = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 6), blue, [0, 0.32, 0])
      big.rotation.x = Math.PI / 2
      const small = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 6), blue, [0.14, 0.12, 0.04])
      small.rotation.x = Math.PI / 2
      g.add(big, small, glow('#38BDF8', 0.6, 0.5, 0.5, [0, 0.32, 0]))
      return { group: g, glowAt: [0.32, 0.36, 0.36] }
    }
    case 'racer': {
      // A gold trophy cup with handles on a black base.
      const cup = new THREE.LatheGeometry(
        [[0.02, 0], [0.05, 0.02], [0.03, 0.12], [0.04, 0.16], [0.13, 0.24], [0.16, 0.36], [0.155, 0.38]].map(([x, y]) => new THREE.Vector2(x, y)),
        48,
      )
      g.add(mesh(cup, gold(), [0, 0.06, 0]))
      for (const side of [-1, 1]) {
        const handle = mesh(new THREE.TorusGeometry(0.06, 0.014, 10, 24, Math.PI), gold(), [side * 0.16, 0.36, 0])
        handle.rotation.z = side * -Math.PI / 2
        g.add(handle)
      }
      g.add(mesh(roundBox(0.14, 0.07, 0.1), glossy('#15171C'), [0, 0.03, 0]), glow('#FDE68A', 0.5, 0.45, 0.45, [0, 0.34, 0.05]))
      return { group: g, glowAt: [0.3, 0.4, 0.4] }
    }
    case 'shade': {
      // A great violet sword: gem pommel, wrapped grip, winged guard, a blade with a glowing core.
      const dark = satin('#14101F')
      g.add(mesh(new THREE.OctahedronGeometry(0.04, 0), glowMat('#C4B5FD', 1), [0, -0.17, 0]))
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.24, 16), dark, [0, -0.04, 0]))
      for (const side of [-1, 1]) {
        const wing = new THREE.Shape()
        wing.moveTo(0, 0)
        wing.quadraticCurveTo(0.08, 0.02, 0.17, 0.09)
        wing.lineTo(0.1, -0.005)
        wing.quadraticCurveTo(0.05, -0.03, 0, -0.03)
        wing.closePath()
        const w = mesh(slab(wing, 0.02, 0.006), glowMat('#6D28D9', 0.45), [0, 0.09, 0])
        w.scale.x = side
        g.add(w)
      }
      g.add(mesh(new THREE.OctahedronGeometry(0.03, 0), glowMat('#EDE9FE', 1.2), [0, 0.085, 0.02]))
      const blade = (w: number, tip: number, top: number) => {
        const b = new THREE.Shape()
        b.moveTo(-w, 0.1)
        b.lineTo(w, 0.1)
        b.lineTo(w * 0.8, top)
        b.lineTo(0, tip)
        b.lineTo(-w * 0.8, top)
        b.closePath()
        return b
      }
      g.add(mesh(slab(blade(0.05, 1.2, 1.06), 0.014, 0.005), glowMat('#8B5CF6', 0.7)))
      g.add(mesh(slab(blade(0.016, 1.12, 1.02), 0.02, 0.004), glowMat('#F5F3FF', 1.4), [0, 0, 0.004]))
      g.add(glow('#8B5CF6', 0.6, 0.4, 1.35, [0, 0.62, 0]))
      return { group: g, glowAt: [0.62, 0.3, 1.1] }
    }
    case 'clockwork': {
      // A big brass wind-up key.
      const b = brass()
      g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 20), b, [0, 0.2, 0]))
      for (const side of [-1, 1]) {
        const loop = mesh(new THREE.TorusGeometry(0.085, 0.025, 12, 32), b, [side * 0.09, 0.52, 0])
        g.add(loop)
      }
      g.add(mesh(new THREE.SphereGeometry(0.04, 20, 14), b, [0, 0.48, 0]))
      g.add(mesh(roundBox(0.09, 0.05, 0.04), b, [0.05, -0.02, 0]))
      return { group: g, glowAt: [0.5, 0.36, 0.3] }
    }
    default:
      return null
  }
}

/** Left-hand items (local origin is the hand): the butler's notepad, the tower shield. */
export function achOffhand(gear: Gear, fx: ((t: number) => void)[] = []): THREE.Group | null {
  const g = new THREE.Group()
  switch (gear) {
    case 'butler': {
      const pad = mesh(roundBox(0.16, 0.22, 0.02), toy('#FFFFFF', 0.5, 0.2), [0, 0.06, 0.08])
      pad.rotation.z = 0.3
      const pen = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 10), satin('#15171C'), [0.08, 0.1, 0.1])
      pen.rotation.z = -0.5
      g.add(pad, pen)
      return g
    }
    case 'aegis': {
      // A tall blue heater shield (flat top, pointed bottom) with a gold rim, cross and gem.
      const outline = (k: number) => {
        const sh = new THREE.Shape()
        sh.moveTo(-0.24 * k, 0.34 * k)
        sh.lineTo(0.24 * k, 0.34 * k)
        sh.lineTo(0.24 * k, 0.02 * k)
        sh.quadraticCurveTo(0.22 * k, -0.24 * k, 0, -0.38 * k)
        sh.quadraticCurveTo(-0.22 * k, -0.24 * k, -0.24 * k, 0.02 * k)
        sh.closePath()
        return sh
      }
      g.add(mesh(slab(outline(1.08), 0.04, 0.012), gold(), [0, 0, -0.01])) // rim
      g.add(mesh(slab(outline(1), 0.05, 0.01), toy('#24418A', 0.32, 0.7), [0, 0, 0]))
      g.add(mesh(roundBox(0.04, 0.58, 0.02), gold(), [0, -0.01, 0.06]), mesh(roundBox(0.38, 0.04, 0.02), gold(), [0, 0.12, 0.06]))
      const gem = mesh(new THREE.OctahedronGeometry(0.055, 0), glowMat('#7DD3FC', 0.9), [0, 0.12, 0.08])
      gem.scale.z = 0.5
      g.add(gem)
      // Energy: a glowing edge that pulses, a hex field shimmering over the face, the gem flaring.
      const edgeMat = glowMat('#38BDF8', 1)
      const edgePts = outline(1.12).getSpacedPoints(90).map((p) => new THREE.Vector3(p.x, p.y, 0.035))
      g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePts, true), 120, 0.008, 6, true), edgeMat))
      const hexMat = new THREE.LineBasicMaterial({ color: '#BAE6FD', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
      const hs = 0.055
      for (let row = -3; row <= 3; row++)
        for (let col = -2; col <= 2; col++) {
          const x = col * hs * 1.73 + (row % 2 ? hs * 0.866 : 0)
          const y = row * hs * 1.5
          if (Math.abs(x) > 0.2 || y > 0.3 || y < -0.3 + Math.abs(x)) continue
          const pts = Array.from({ length: 7 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 + Math.PI / 6
            return new THREE.Vector3(x + Math.cos(a) * hs, y + Math.sin(a) * hs, 0.07)
          })
          g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), hexMat))
        }
      const flare = glow('#7DD3FC', 0.6, 0.3, 0.3, [0, 0.12, 0.1])
      const field = glow('#38BDF8', 0.25, 0.7, 0.9, [0, 0, 0.09])
      g.add(flare, field)
      fx.push((t) => {
        const k = 0.5 + 0.5 * Math.sin(t * 2.4)
        edgeMat.emissiveIntensity = 0.6 + 1.0 * k
        hexMat.opacity = 0.15 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.6 + 0.8))
        flare.material.opacity = 0.35 + 0.55 * k
        field.material.opacity = 0.12 + 0.18 * k
      })
      g.position.set(0.02, -0.06, 0.22)
      return g
    }
    default:
      return null
  }
}

/** Things worn at the neck: the butler's bow tie, the clockwork pocket watch. */
export function achExtras(gear: Gear): THREE.Group | null {
  const g = new THREE.Group()
  switch (gear) {
    case 'butler': {
      for (const side of [-1, 1]) {
        const wing = mesh(new THREE.ConeGeometry(0.06, 0.12, 4), satin('#15171C'), [side * 0.065, wy(500), FRONT_Z - 0.05])
        wing.rotation.z = (side * Math.PI) / 2
        g.add(wing)
      }
      g.add(mesh(new THREE.SphereGeometry(0.03, 16, 12), satin('#15171C'), [0, wy(500), FRONT_Z - 0.04]))
      return g
    }
    case 'shade': {
      const gem = mesh(new THREE.OctahedronGeometry(0.045, 0), glowMat('#A78BFA', 1), [0, wy(500), FRONT_Z - 0.03])
      gem.scale.set(0.9, 1.2, 0.5)
      g.add(gem)
      return g
    }
    default:
      return null
  }
}

/** Suits and armor around the handle (radius `r`). */
export function achBody(gear: Gear, r: number, g: THREE.Group) {
  const at = (y: number) => wy(y)
  const tube = (top: number, bottom: number, material: THREE.Material, grow = 0.03, flare = 0.03) =>
    g.add(mesh(new THREE.CylinderGeometry(r + grow, r + grow + flare, (bottom - top) * S, 32), material, [0, at((top + bottom) / 2), 0]))
  switch (gear) {
    case 'butler': {
      tube(506, 610, glossy('#15171C'), 0.03, 0.05) // tailcoat
      g.add(mesh(roundBox(0.1, 0.34, 0.02), toy('#FFFFFF', 0.45, 0.3), [0, at(552), r + 0.045])) // shirt front
      for (const y of [526, 552, 578]) g.add(mesh(new THREE.SphereGeometry(0.014, 12, 10), gold(), [0, at(y), r + 0.06]))
      for (const side of [-1, 1]) {
        const tail = mesh(roundBox(0.09, 0.3, 0.02), glossy('#15171C'), [side * 0.07, at(640), -(r + 0.03)])
        tail.rotation.z = side * 0.12
        g.add(tail)
      }
      break
    }
    case 'aegis':
      tube(500, 600, steel(), 0.035, 0.03) // breastplate
      for (const side of [-1, 1]) {
        const pauldron = mesh(new THREE.SphereGeometry(0.11, 24, 16), steel(), [side * (r + 0.1), at(492), 0])
        pauldron.scale.y = 0.7
        g.add(pauldron)
      }
      g.add(mesh(roundBox(0.1, 0.12, 0.02), toy('#2B4FA0', 0.3, 0.7), [0, at(540), r + 0.06]))
      g.add(mesh(new THREE.CylinderGeometry(r + 0.045, r + 0.045, 18 * S, 32), gold(), [0, at(600), 0]))
      break
    case 'racer': {
      tube(504, 616, glossy('#D61F2C'), 0.03, 0.02) // race suit
      for (const side of [-1, 1]) g.add(mesh(roundBox(0.025, 0.4, 0.02), toy('#FFFFFF', 0.4, 0.3), [side * (r + 0.02), at(560), r * 0.6]))
      g.add(mesh(new THREE.CylinderGeometry(r + 0.04, r + 0.04, 16 * S, 32), gold(), [0, at(584), 0]))
      g.add(mesh(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshStandardMaterial({ map: textTexture('01', '#FFFFFF', '#15171C'), roughness: 0.5 }), [0.04, at(530), r + 0.036]))
      const collar = mesh(new THREE.CylinderGeometry(r + 0.04, r + 0.04, 14 * S, 32), new THREE.MeshStandardMaterial({ map: checkerTexture(8), roughness: 0.5 }), [0, at(506), 0])
      g.add(collar)
      break
    }
    case 'shade': {
      tube(504, 690, satin('#14101F'), 0.04, 0.14) // robe
      const trim = (y: number, radius: number) => {
        const t = mesh(new THREE.TorusGeometry(radius, 0.012, 8, 48), glowMat('#8B5CF6', 0.9), [0, at(y), 0])
        t.rotation.x = Math.PI / 2
        return t
      }
      g.add(trim(560, r + 0.075), trim(686, r + 0.18))
      for (const side of [-1, 1]) {
        const pauldron = mesh(new THREE.SphereGeometry(0.11, 24, 16), satin('#1E1433'), [side * (r + 0.1), at(494), 0])
        pauldron.scale.y = 0.65
        const spike = mesh(new THREE.ConeGeometry(0.03, 0.16, 4), glowMat('#A78BFA', 0.6), [side * (r + 0.17), at(470), 0])
        spike.rotation.z = side * -0.7
        g.add(pauldron, spike)
      }
      break
    }
    case 'clockwork': {
      tube(504, 600, satin('#5A3A1E'), 0.03, 0.03) // leather vest
      for (const y of [524, 552, 580]) g.add(mesh(new THREE.SphereGeometry(0.016, 12, 10), brass(), [0, at(y), r + 0.05]))
      // Pocket watch on its chain.
      const watch = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 32), brass(), [r * 0.7, at(586), r * 0.75])
      watch.rotation.x = Math.PI / 2
      g.add(watch, mesh(new THREE.CircleGeometry(0.048, 32), toy('#FFF7E0', 0.4, 0.3), [r * 0.7, at(586), r * 0.75 + 0.012]))
      break
    }
  }
}

/** Each skin's own backdrop behind the premium glow. `steps` animate it. */
export function achPremium(gear: Gear, g: THREE.Group, steps: ((t: number) => void)[]) {
  const rays = (color: string, count: number, speed: number) => {
    const fan = new THREE.Group()
    fan.position.set(0, 1.45, -0.75)
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
    for (let i = 0; i < count; i++) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 2.4), m)
      ray.geometry.translate(0, 1.2, 0)
      ray.rotation.z = (i / count) * Math.PI * 2
      fan.add(ray)
    }
    g.add(fan)
    steps.push((t) => {
      fan.rotation.z = t * speed
      m.opacity = 0.16 + 0.08 * Math.sin(t * 1.6)
    })
  }

  switch (gear) {
    case 'butler':
      rays('#F5C451', 14, 0.12)
      g.add(glow('#FDE68A', 0.6, 1.8, 0.35, [0, 0.03, 0.1])) // spotlight on the floor
      break
    case 'aegis': {
      // A honeycomb barrier shimmering behind the knight.
      const hex = new THREE.Group()
      hex.position.set(0, 1.4, -0.8)
      const edge = new THREE.LineBasicMaterial({ color: '#7DD3FC', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
      const size = 0.17
      for (let row = -6; row <= 6; row++)
        for (let col = -5; col <= 5; col++) {
          const x = col * size * 1.73 + (row % 2 ? size * 0.866 : 0)
          const y = row * size * 1.5
          if (Math.hypot(x, y * 0.9) > 1.35) continue
          const pts = Array.from({ length: 7 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 + Math.PI / 6
            return new THREE.Vector3(x + Math.cos(a) * size, y + Math.sin(a) * size, 0)
          })
          hex.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), edge))
        }
      g.add(hex)
      steps.push((t) => {
        edge.opacity = 0.32 + 0.22 * Math.sin(t * 2)
        hex.rotation.z = Math.sin(t * 0.4) * 0.05
      })
      break
    }
    case 'racer': {
      rays('#EF4444', 18, 0.35)
      // Two checkered flags waving behind the shoulders.
      const cloth = new THREE.MeshStandardMaterial({ map: checkerTexture(6), side: THREE.DoubleSide, roughness: 0.6 })
      for (const side of [-1, 1]) {
        const pole = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 10), steel(), [side * 0.95, 2.1, -0.4])
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34, 8, 1), cloth)
        flag.geometry.translate(side * 0.25, 0, 0)
        flag.position.set(side * 0.95, 2.58, -0.4)
        g.add(pole, flag)
        const pos = flag.geometry.attributes.position as THREE.BufferAttribute
        const base = Float32Array.from(pos.array as Float32Array)
        steps.push((t) => {
          for (let i = 0; i < pos.count; i++) {
            const x = base[i * 3]
            pos.setZ(i, Math.sin(t * 6 + x * 9) * 0.04 * Math.abs(x) * 4)
          }
          pos.needsUpdate = true
        })
      }
      break
    }
    case 'shade': {
      // Swords fanned behind the back like wings, breathing slowly.
      const wings = new THREE.Group()
      wings.position.set(0, 1.85, -0.55)
      const steelGlow = glowMat('#A78BFA', 0.55)
      for (const side of [-1, 1])
        for (let i = 0; i < 4; i++) {
          const sword = new THREE.Group()
          const b = new THREE.Shape()
          b.moveTo(-0.045, 0)
          b.lineTo(0.045, 0)
          b.lineTo(0.032, 0.9)
          b.lineTo(0, 1.02)
          b.lineTo(-0.032, 0.9)
          b.closePath()
          sword.add(mesh(slab(b, 0.01, 0.003), steelGlow), mesh(roundBox(0.14, 0.03, 0.02), satin('#14101F'), [0, 0, 0]))
          sword.position.set(side * 0.42, -0.2, 0)
          sword.rotation.z = side * -(0.45 + i * 0.3)
          wings.add(sword)
        }
      g.add(wings)
      steps.push((t) => {
        const k = 1 + 0.04 * Math.sin(t * 1.8)
        wings.scale.set(k, k, 1)
      })
      // Lightning crackling around.
      const bolts: THREE.Line[] = []
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.3
        const start = new THREE.Vector3(Math.cos(a) * 1.0, 1.45 + Math.sin(a) * 1.2, -0.45)
        const pts = [start]
        for (let k = 1; k <= 7; k++) pts.push(start.clone().add(new THREE.Vector3((Math.sin(i * 7 + k * 3) * 0.5) * 0.28, -k * 0.13, 0)))
        const bolt = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: i % 2 ? '#C4B5FD' : '#F5F3FF', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
        )
        bolts.push(bolt)
        g.add(bolt)
      }
      steps.push((t) => bolts.forEach((b, i) => ((b.material as THREE.LineBasicMaterial).opacity = Math.sin(t * 8 + i * 1.7) > 0.7 ? 1 : 0)))
      // Daggers circling.
      // Daggers circling the robe (low, so they never cross the face).
      const orbit = new THREE.Group()
      orbit.position.y = 0.55
      for (let i = 0; i < 5; i++) {
        const t = (i / 5) * Math.PI * 2
        const dagger = mesh(new THREE.ConeGeometry(0.035, 0.36, 4), glowMat('#A78BFA', 0.8), [Math.cos(t) * 0.95, Math.sin(t * 2) * 0.15, Math.sin(t) * 0.95])
        dagger.rotation.z = Math.PI / 2
        orbit.add(dagger)
      }
      g.add(orbit)
      steps.push((t) => (orbit.rotation.y = -t * 0.6))
      // A glowing rune circle and violet flames at the feet.
      const rune = mesh(new THREE.TorusGeometry(0.62, 0.012, 8, 80), glowMat('#8B5CF6', 1), [0, 0.02, 0])
      rune.rotation.x = Math.PI / 2
      const runeInner = mesh(new THREE.TorusGeometry(0.48, 0.008, 8, 6), glowMat('#C4B5FD', 1), [0, 0.021, 0])
      runeInner.rotation.x = Math.PI / 2
      g.add(rune, runeInner)
      steps.push((t) => (runeInner.rotation.z = t * 0.5))
      for (let i = 0; i < 5; i++) {
        const x = -0.5 + i * 0.25
        const f = glow(i % 2 ? '#A78BFA' : '#7C3AED', 0.7, 0.22, 0.4, [x, 0.18, 0.1])
        g.add(f)
        steps.push((t) => {
          const k = 0.8 + 0.3 * Math.sin(t * 9 + i * 1.4)
          f.scale.set(0.22, 0.4 * k, 1)
          f.position.y = 0.16 + (k - 1) * 0.1
        })
      }
      break
    }
    case 'clockwork': {
      // Brass gears turning behind, meshing at different speeds, around a clock ring.
      const b = brass()
      const back = new THREE.Group()
      back.position.set(0, 1.45, -0.85)
      const gears: [number, number, number, number, number][] = [[-0.55, 0.35, 0.42, 14, 0.4], [0.5, 0.55, 0.32, 11, -0.53], [0.25, -0.45, 0.26, 9, 0.65], [-0.45, -0.55, 0.2, 8, -0.8]]
      for (const [x, y, rad, teeth, speed] of gears) {
        const c = cog(rad, teeth, b, 0.04)
        c.position.set(x, y, 0)
        back.add(c)
        steps.push((t) => (c.rotation.z = t * speed))
      }
      const ring = mesh(new THREE.TorusGeometry(1.05, 0.02, 8, 96), b)
      back.add(ring)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        back.add(mesh(roundBox(0.03, i % 3 ? 0.07 : 0.13, 0.02), b, [Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0.01]))
      }
      const hand = mesh(roundBox(0.025, 0.8, 0.02), b)
      hand.geometry.translate(0, 0.4, 0)
      back.add(hand)
      steps.push((t) => (hand.rotation.z = -t * 0.9))
      g.add(back)
      break
    }
  }
}
