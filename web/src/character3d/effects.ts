import * as THREE from 'three'
import type { EffectVisual } from '../cosmetics/visuals'
import { glow, mesh } from './materials'
import { flameTexture, glowTexture, rayTexture } from './textures'

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
 * Adds the effect to `g`, centred at local height `y` and sized to `size` (the item's length).
 * Returns the animation step for the character's update loop.
 */
export function addEffect(g: THREE.Group, effect: EffectVisual, y: number, size: number): EffectUpdate {
  const c = effect.color
  const halo = sprite(c, glowTexture(), 1, [size * 2.3, size * 2.3], [0, y, 0.02])
  const core = sprite('#FFFFFF', glowTexture(), 0.6, [size * 0.8, size * 0.8], [0, y, 0.03])
  g.add(halo, core)
  const steps: EffectUpdate[] = [(t) => (halo.material.opacity = 0.8 + 0.2 * Math.sin(t * 4))]

  if (effect.kind === 'pulse' || effect.kind === 'wave') {
    const rings = effect.kind === 'wave' ? 2 : 1
    for (let i = 0; i < rings; i++) {
      const m = glow(c, 0.8)
      const ring = mesh(new THREE.TorusGeometry(size * 0.42, 0.012, 12, 64), m, [0, y, 0.04])
      g.add(ring)
      steps.push((t) => {
        const k = (t * 0.9 + i / rings) % 1 // 0..1, repeating
        ring.scale.setScalar(0.7 + k * 0.9)
        m.opacity = 0.85 * (1 - k)
      })
    }
  }

  if (effect.kind === 'spark') {
    const tex = rayTexture()
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2
      const m = glow(i % 2 ? '#FFFFFF' : c, 0.9, tex)
      const bolt = mesh(new THREE.PlaneGeometry(0.05, size * 0.5), m, [Math.cos(angle) * size * 0.45, y + Math.sin(angle) * size * 0.45, 0.05])
      bolt.rotation.z = angle + 0.4
      g.add(bolt)
      steps.push((t) => (m.opacity = Math.max(0, Math.sin(t * 11 + i * 2.1)) * 0.95))
    }
  }

  if (effect.kind === 'flame') {
    const tex = flameTexture()
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * size * 0.28
      const f = sprite(i === 1 ? '#FDE68A' : c, tex, 0.95, [size * 0.4, size * 0.75], [x, y + size * 0.45, 0.04])
      g.add(f)
      steps.push((t) => {
        const k = 0.85 + 0.25 * Math.sin(t * 9 + i * 1.7)
        f.scale.set(size * 0.4, size * 0.75 * k, 1)
        f.position.y = y + size * 0.45 + (k - 1) * size * 0.3
      })
    }
  }

  return (t) => steps.forEach((s) => s(t))
}
