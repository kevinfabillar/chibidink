import * as THREE from 'three'
import type { EffectVisual } from '../cosmetics/visuals'
import { glow, mesh } from './materials'
import { flameTexture, glowTexture } from './textures'

// Paddle effects in 3D: a glow on the outfit's held item (or the raised hand), with a
// different animated extra per kind, matching the 2D version in gearArt.tsx.

export type EffectUpdate = (t: number) => void

function sprite(color: string, map: THREE.Texture, opacity: number, size: [number, number], at: [number, number, number]) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  s.scale.set(size[0], size[1], 1)
  s.position.set(...at)
  return s
}

/**
 * Particles that loop along a path: `place(i, k, out)` puts particle i at life k (0..1). Time-based,
 * so they move at the same speed on every screen; `fade` dims the whole cloud as it pulses.
 */
function particles(g: THREE.Group, count: number, color: string, size: number, speed: number, place: (i: number, k: number, out: THREE.Vector3) => void) {
  const pos = new Float32Array(count * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({ color, size, map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
  g.add(new THREE.Points(geo, mat))
  const offsets = Array.from({ length: count }, (_, i) => (i * 0.618034) % 1)
  const v = new THREE.Vector3()
  return (t: number) => {
    const p = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      place(i, (t * speed + offsets[i]) % 1, v)
      p.setXYZ(i, v.x, v.y, v.z)
    }
    p.needsUpdate = true
    mat.opacity = 0.8 + 0.2 * Math.sin(t * 7)
  }
}

/** A jagged bolt from `from` to `to`, as a white core in a coloured glow. */
function bolt(from: THREE.Vector3, to: THREE.Vector3, color: string, thick: number) {
  const path = new THREE.CurvePath<THREE.Vector3>()
  let prev = from.clone()
  const side = new THREE.Vector3(-(to.y - from.y), to.x - from.x, 0).normalize()
  const len = from.distanceTo(to)
  for (let i = 1; i <= 4; i++) {
    const p = from.clone().lerp(to, i / 4)
    if (i < 4) p.addScaledVector(side, (Math.random() - 0.5) * len * 0.5)
    path.add(new THREE.LineCurve3(prev, p))
    prev = p
  }
  const b = new THREE.Group()
  b.add(mesh(new THREE.TubeGeometry(path, 16, thick * 0.4, 5, false), glow('#FFFFFF', 0.95)))
  b.add(mesh(new THREE.TubeGeometry(path, 16, thick, 6, false), glow(color, 0.55)))
  return b
}

/**
 * Adds the effect to `g`, centred at local height `y` and sized to `size` (the item's length).
 * Returns the animation step for the character's update loop.
 */
export function addEffect(g: THREE.Group, effect: EffectVisual, y: number, size: number): EffectUpdate {
  const c = effect.color
  const halo = sprite(c, glowTexture(), 1, [size * 2.3, size * 2.3], [0, y, 0.02])
  const core = sprite('#FFFFFF', glowTexture(), 0.6, [size * 0.8, size * 0.8], [0, y, 0.03])
  g.add(halo, core)
  const steps: EffectUpdate[] = [
    (t) => {
      const k = 0.5 + 0.5 * Math.sin(t * 4)
      halo.material.opacity = 0.75 + 0.25 * k
      core.scale.setScalar(size * (0.7 + 0.2 * k))
    },
  ]

  // Every effect: a few bright motes circling the item on a tilted orbit, passing in front and behind.
  const motes = Array.from({ length: 4 }, (_, i) => {
    const m = sprite(i % 2 ? '#FFFFFF' : c, glowTexture(), 1, [size * 0.16, size * 0.16], [0, y, 0])
    g.add(m)
    return m
  })
  const orbit = size * 0.62
  steps.push((t) => {
    motes.forEach((m, i) => {
      const a = t * 2.4 + (i / motes.length) * Math.PI * 2
      m.position.set(Math.cos(a) * orbit, y + Math.sin(a) * orbit * 0.3 + Math.sin(t * 3 + i) * size * 0.05, Math.sin(a) * orbit * 0.5 + 0.04)
      m.material.opacity = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(a)) // brighter in front
    })
  })

  switch (effect.kind) {
    case 'pulse': {
      // Energy rings beating out from a core that flares with each beat; motes drifting up.
      for (let i = 0; i < 2; i++) {
        const m = glow(c, 0.8)
        const ring = mesh(new THREE.TorusGeometry(size * 0.42, 0.012, 12, 64), m, [0, y, 0.04])
        const soft = glow(c, 0.3)
        const wide = mesh(new THREE.TorusGeometry(size * 0.42, 0.04, 8, 64), soft, [0, y, 0.035])
        g.add(ring, wide)
        steps.push((t) => {
          const k = (t * 0.9 + i / 2) % 1 // 0..1, repeating
          ring.scale.setScalar(0.6 + k * 1.1)
          wide.scale.setScalar(0.6 + k * 1.1)
          m.opacity = 0.9 * (1 - k)
          soft.opacity = 0.3 * (1 - k)
        })
      }
      const flare = sprite(c, glowTexture(), 0, [size * 1.2, size * 1.2], [0, y, 0.035])
      g.add(flare)
      steps.push((t) => (flare.material.opacity = 0.7 * Math.max(0, 1 - ((t * 1.8) % 1) * 4)))
      steps.push(
        particles(g, 14, c, size * 0.07, 0.45, (i, k, out) => {
          const a = i * 2.39996
          const r = size * (0.2 + 0.25 * ((i * 0.37) % 1))
          out.set(Math.cos(a) * r, y - size * 0.2 + k * size * 1.2, Math.sin(a) * r * 0.5 + 0.03)
        }),
      )
      break
    }
    case 'spark': {
      // Lightning crackling out from the item in quick strikes, with sparks spraying off it.
      const slots = Array.from({ length: 5 }, (_, s) => {
        const a = (s / 5) * Math.PI * 2 + 0.3
        const variants = [0, 1].map(() => {
          const from = new THREE.Vector3(Math.cos(a) * size * 0.18, y + Math.sin(a) * size * 0.18, 0.05)
          const to = new THREE.Vector3(Math.cos(a + 0.3) * size * 1.05, y + Math.sin(a + 0.3) * size * 1.05, 0.05)
          const b = bolt(from, to, s % 2 ? '#FFFFFF' : c, 0.026)
          b.visible = false
          g.add(b)
          return b
        })
        return { variants, rate: 1.4 + s * 0.37, phase: s * 0.29 }
      })
      steps.push((t) => {
        for (const slot of slots) {
          const cycle = t * slot.rate + slot.phase
          const frac = cycle % 1
          const on = frac < 0.2 || (frac > 0.26 && frac < 0.45)
          slot.variants.forEach((b, i) => (b.visible = on && i === Math.floor(cycle) % 2))
        }
      })
      steps.push(
        particles(g, 16, '#FFFFFF', size * 0.06, 1.6, (i, k, out) => {
          const a = i * 2.39996
          const r = size * (0.15 + k * 0.8)
          out.set(Math.cos(a) * r, y + Math.sin(a) * r - k * k * size * 0.3, 0.05)
        }),
      )
      break
    }
    case 'flame': {
      // Flames wrapping the item with white-hot hearts, a heat glow, embers rising.
      const tex = flameTexture()
      g.add(sprite('#FF4D1A', glowTexture(), 0.5, [size * 1.6, size * 1.9], [0, y + size * 0.25, 0.01]))
      const flames: { f: THREE.Sprite; x: number; w: number; h: number; speed: number; phase: number }[] = []
      const add = (color: string, x: number, w: number, h: number, z: number) => {
        const f = sprite(color, tex, 0.95, [w, h], [x, y + h * 0.5, z])
        g.add(f)
        flames.push({ f, x, w, h, speed: 8 + flames.length * 1.3, phase: flames.length * 1.7 })
      }
      for (const [i, x] of [-0.36, -0.18, 0, 0.18, 0.36].entries())
        add(i === 2 ? '#FDE68A' : i % 2 ? c : '#FF4D1A', x * size * 1.2, size * (i === 2 ? 0.6 : 0.46), size * (i === 2 ? 1.3 : 0.95 - Math.abs(x) * 0.6), 0.04)
      for (const x of [-0.14, 0.14]) add('#FFF3C4', x * size, size * 0.24, size * 0.6, 0.05)
      steps.push((t) => {
        for (const fl of flames) {
          const k = 0.82 + 0.25 * Math.sin(t * fl.speed + fl.phase) + 0.06 * Math.sin(t * 23 + fl.phase)
          fl.f.scale.set(fl.w * (1.05 - (k - 1) * 0.4), fl.h * k, 1)
          fl.f.position.set(fl.x + Math.sin(t * 3 + fl.phase) * size * 0.02, y + (fl.h * k) * 0.5, fl.f.position.z)
        }
      })
      steps.push(
        particles(g, 14, '#FFB347', size * 0.07, 0.9, (i, k, out) => {
          const x0 = (((i * 0.37) % 1) - 0.5) * size * 0.8
          out.set(x0 + Math.sin(k * 6 + i) * size * 0.08, y + size * 0.3 + k * size * 1.3, 0.05)
        }),
      )
      break
    }
    case 'wave': {
      // Water: ripples spreading, a ring of water swirling round the item at a tilt, bubbles rising.
      for (let i = 0; i < 2; i++) {
        const m = glow(c, 0.8)
        const ring = mesh(new THREE.TorusGeometry(size * 0.42, 0.012, 12, 64), m, [0, y, 0.04])
        g.add(ring)
        steps.push((t) => {
          const k = (t * 0.7 + i / 2) % 1
          ring.scale.setScalar(0.7 + k * 0.9)
          m.opacity = 0.85 * (1 - k)
        })
      }
      const swirl = new THREE.Group()
      swirl.position.set(0, y, 0.02)
      swirl.rotation.x = 1.15
      const water = new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.5, transparent: true, opacity: 0.6, roughness: 0.05, clearcoat: 1, depthWrite: false })
      const stream = mesh(new THREE.TorusGeometry(size * 0.55, size * 0.025, 10, 80, Math.PI * 1.4), water)
      const stream2 = mesh(new THREE.TorusGeometry(size * 0.48, size * 0.015, 8, 64, Math.PI * 0.9), glow('#FFFFFF', 0.6))
      swirl.add(stream, stream2)
      g.add(swirl)
      steps.push((t) => {
        stream.rotation.z = t * 2.2
        stream2.rotation.z = -t * 2.8 + 1
        swirl.rotation.y = Math.sin(t * 0.9) * 0.3
      })
      const bubbleMat = new THREE.MeshPhysicalMaterial({ color: '#E0FFFF', transparent: true, opacity: 0.55, roughness: 0, clearcoat: 1, emissive: c, emissiveIntensity: 0.25, depthWrite: false })
      const bubbles = Array.from({ length: 7 }, (_, i) => {
        const b = mesh(new THREE.SphereGeometry(size * (0.035 + (i % 3) * 0.015), 14, 10), bubbleMat)
        g.add(b)
        return { b, x: (((i * 0.43) % 1) - 0.5) * size * 0.9, off: (i * 0.618) % 1, speed: 0.35 + (i % 3) * 0.1 }
      })
      steps.push((t) => {
        for (const [i, bb] of bubbles.entries()) {
          const k = (t * bb.speed + bb.off) % 1
          bb.b.position.set(bb.x + Math.sin(t * 4 + i) * size * 0.05, y - size * 0.3 + k * size * 1.3, 0.06)
          bb.b.scale.setScalar(Math.sin(k * Math.PI) * 1.1)
        }
      })
      break
    }
  }

  return (t) => steps.forEach((s) => s(t))
}
