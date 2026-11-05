import * as THREE from 'three'
import type { AuraVisual } from '../cosmetics/visuals'
import { S } from './gear'
import { glow, mesh } from './materials'
import { auraColumnTexture, flameTexture, glowTexture, rayTexture } from './textures'

export interface AuraRig {
  group: THREE.Group
  update: (t: number) => void
}

/**
 * Maps a point from the 2D aura artwork (parts/Aura.tsx, the old 204-wide stage) to world
 * coordinates, using the same fit as the 2D avatar, so 3D auras match their 2D look and icons.
 */
function fromArt(x: number, y: number): [number, number] {
  const nx = (x + 22) * (858 / 204) - 129
  const ny = (y + 2) * (858 / 204) - 110
  return [(nx - 300) * S, (748 - ny) * S]
}

/** A soft additive glow that always faces the camera (no hard edges from any angle). */
function sprite(color: string, map: THREE.Texture, opacity: number, w: number, h: number, at: [number, number, number]) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  s.scale.set(w, h, 1)
  s.position.set(...at)
  return s
}

/** Ground glow, light column and rising sparkles, plus orbits / rays / flames / bolts per kind. */
export function buildAura(a: AuraVisual): AuraRig {
  const g = new THREE.Group()

  const disc = mesh(new THREE.CircleGeometry(1.15, 64), glow(a.color, 0.55, glowTexture()), [0, 0.012, 0])
  disc.rotation.x = -Math.PI / 2
  // Crisp ring with a wide soft halo around it.
  const ring = mesh(new THREE.TorusGeometry(0.9, 0.018, 16, 160), glow(a.accent, 0.9), [0, 0.02, 0])
  ring.rotation.x = Math.PI / 2
  const halo = mesh(new THREE.RingGeometry(0.72, 1.1, 96), glow(a.color, 0.35, ringTexture()), [0, 0.016, 0])
  halo.rotation.x = -Math.PI / 2
  // Soft light column behind the character.
  const column = sprite(a.color, auraColumnTexture(), 0.55, 2.3, 3.4, [0, 1.45, -0.35])
  g.add(disc, halo, ring, column)

  // Sparkles drifting upward, in a few sizes.
  const count = 56
  const positions = new Float32Array(count * 3)
  const speeds: number[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 0.55 + Math.random() * 0.45
    positions.set([Math.cos(angle) * radius, Math.random() * 2.8, Math.sin(angle) * radius], i * 3)
    speeds.push(0.25 + Math.random() * 0.45)
  }
  const sparkGeo = new THREE.BufferGeometry()
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({ color: a.accent, size: 0.09, map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  )
  g.add(sparks)

  let spin: THREE.Group | null = null
  const orbit = a.kind === 'orbit' ? orbits(a) : a.kind === 'celestial' ? celestial(a) : a.kind === 'phoenix' ? phoenix(a) : null
  if (orbit) g.add(orbit.group)
  if (a.kind === 'nova') {
    spin = new THREE.Group()
    spin.position.set(0, 1.35, -0.45)
    const tex = rayTexture()
    for (let i = 0; i < 12; i++) {
      const ray = mesh(new THREE.PlaneGeometry(0.22, 3.4), glow(a.accent, 0.45, tex))
      ray.rotation.z = (i / 12) * Math.PI
      spin.add(ray)
    }
    g.add(spin, sprite(a.accent, glowTexture(), 0.5, 1.6, 1.6, [0, 1.35, -0.46]))
  }
  const fire = a.kind === 'flame' ? inferno(a) : null
  if (fire) g.add(fire.group)
  if (a.kind === 'spark') g.add(bolts(a))

  return {
    group: g,
    update(t) {
      column.material.opacity = 0.45 + 0.12 * Math.sin(t * 2.4)
      ring.scale.setScalar(1 + 0.03 * Math.sin(t * 3))
      halo.scale.setScalar(1 + 0.04 * Math.sin(t * 3))
      const p = sparkGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < count; i++) p.setY(i, (p.getY(i) + speeds[i] * 0.016) % 2.8)
      p.needsUpdate = true
      if (spin) spin.rotation.z = t * 0.25
      orbit?.update(t)
      fire?.update(t)
    },
  }
}

/** Radial fade for the ground halo: bright in the middle of the ring, soft on both sides. */
function ringTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0.6, 'rgba(255,255,255,0)')
  g.addColorStop(0.82, 'rgba(255,255,255,1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** The 2D bolts (Aura.tsx), as glowing tubes beside the head and body. */
const BOLTS: [number, number][][] = [
  [[22, 70], [31, 82], [24, 85], [35, 100]],
  [[140, 84], [131, 95], [138, 98], [128, 113]],
  [[18, 150], [28, 158], [22, 162], [32, 171]],
  [[144, 150], [134, 158], [140, 162], [130, 171]],
]

function bolts(a: AuraVisual) {
  const g = new THREE.Group()
  for (const pts of BOLTS) {
    const path = new THREE.CurvePath<THREE.Vector3>()
    const v = pts.map(([x, y]) => new THREE.Vector3(...fromArt(x, y), 0.05))
    for (let i = 1; i < v.length; i++) path.add(new THREE.LineCurve3(v[i - 1], v[i]))
    // A thin bright core inside a wider soft glow, like the 2D bolt.
    g.add(mesh(new THREE.TubeGeometry(path, 48, 0.014, 12, false), glow(a.accent, 0.95)))
    g.add(mesh(new THREE.TubeGeometry(path, 48, 0.055, 12, false), glow(a.color, 0.35)))
  }
  return g
}

/**
 * Flame: a blazing ring of tall flickering flames with white-hot cores, flames climbing both sides
 * of the body, fast embers and a strong heat glow.
 */
function inferno(a: AuraVisual) {
  const g = new THREE.Group()
  const tex = flameTexture()
  const flames: { s: THREE.Sprite; w: number; h: number; y: number; speed: number; phase: number }[] = []
  const add = (color: string, w: number, h: number, at: [number, number, number], opacity = 0.95) => {
    const s = sprite(color, tex, opacity, w, h, at)
    g.add(s)
    flames.push({ s, w, h, y: at[1], speed: 9 + Math.random() * 6, phase: Math.random() * 6.3 })
  }
  // Heat glow behind and around the character.
  g.add(sprite('#FF4D1A', glowTexture(), 0.55, 2.8, 3.4, [0, 1.3, -0.5]), sprite(a.color, glowTexture(), 0.6, 2.6, 1.0, [0, 0.35, 0]))
  // Two rings of ground flames: big outer ones and white-hot inner tongues.
  for (let i = 0; i < 22; i++) {
    const t = (i / 22) * Math.PI * 2
    add(i % 3 === 0 ? a.accent : i % 3 === 1 ? '#FF4D1A' : a.color, 0.42, 0.95, [Math.cos(t) * 0.95, 0.42, Math.sin(t) * 0.95])
  }
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * Math.PI * 2 + 0.2
    add('#FFF3C4', 0.2, 0.45, [Math.cos(t) * 0.88, 0.22, Math.sin(t) * 0.88], 0.85)
  }
  // Flames climbing the sides of the body.
  for (const side of [-1, 1])
    for (let k = 0; k < 4; k++) add(k % 2 ? a.accent : a.color, 0.36 - k * 0.05, 0.7 - k * 0.08, [side * (0.95 - k * 0.05), 0.85 + k * 0.42, -0.1], 0.85 - k * 0.12)
  // Embers shooting upward.
  const count = 40
  const pos = new Float32Array(count * 3)
  const speeds: number[] = []
  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2
    const r = 0.5 + Math.random() * 0.6
    pos.set([Math.cos(t) * r, Math.random() * 3, Math.sin(t) * r], i * 3)
    speeds.push(0.9 + Math.random() * 1.2)
  }
  const emberGeo = new THREE.BufferGeometry()
  emberGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.add(new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: '#FFB347', size: 0.08, map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })))
  let last = 0
  return {
    group: g,
    update(t: number) {
      for (const f of flames) {
        const k = 0.8 + 0.3 * Math.sin(t * f.speed + f.phase) + 0.08 * Math.sin(t * 23 + f.phase)
        f.s.scale.set(f.w * (1.05 - (k - 1) * 0.4), f.h * k, 1)
        f.s.position.y = f.y + (k - 1) * f.h * 0.35
      }
      const dt = Math.min(0.05, Math.max(0, t - last)) || 0.016
      last = t
      const p = emberGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < count; i++) p.setY(i, (p.getY(i) + speeds[i] * dt) % 3)
      p.needsUpdate = true
    },
  }
}

/**
 * The shine shared by the top auras: a big glow behind the character, a bright floor pool,
 * a soft light pillar and sparks rising all the way up (as on the Flame aura).
 */
function radiance(g: THREE.Group, glowColor: string, pool: string, sparkColor: string, count = 44) {
  const back = sprite(glowColor, glowTexture(), 0.4, 2.8, 3.4, [0, 1.35, -0.55])
  const floor = sprite(pool, glowTexture(), 0.5, 2.4, 0.8, [0, 0.3, 0])
  g.add(back, floor)
  const pos = new Float32Array(count * 3)
  const speeds: number[] = []
  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2
    const r = 0.45 + Math.random() * 0.75
    pos.set([Math.cos(t) * r, Math.random() * 3.2, Math.sin(t) * r], i * 3)
    speeds.push(0.5 + Math.random() * 0.9)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const sparks = new THREE.PointsMaterial({ color: sparkColor, size: 0.07, map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
  g.add(new THREE.Points(geo, sparks))
  let last = 0
  return (t: number) => {
    back.material.opacity = 0.35 + 0.1 * Math.sin(t * 2)
    sparks.opacity = 0.75 + 0.25 * Math.sin(t * 9)
    const dt = Math.min(0.05, Math.max(0, t - last)) || 0.016
    last = t
    const p = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < count; i++) p.setY(i, (p.getY(i) + speeds[i] * dt) % 3.2)
    p.needsUpdate = true
  }
}

/** Celestial: a ring of stars turning around the character, a crescent moon above, twinkles. */
function celestial(a: AuraVisual) {
  const g = new THREE.Group()
  const ring = new THREE.Group()
  ring.position.y = 1.35
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * Math.PI * 2
    ring.add(sprite(i % 2 ? a.accent : '#FFFFFF', glowTexture(), 1, i % 3 ? 0.14 : 0.26, i % 3 ? 0.14 : 0.26, [Math.cos(t) * 1.05, Math.sin(t * 3) * 0.08, Math.sin(t) * 1.05]))
  }
  // A second, wider ring of stars turning the other way, higher up.
  const ring2 = new THREE.Group()
  ring2.position.y = 2.0
  ring2.rotation.z = 0.2
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * Math.PI * 2
    ring2.add(sprite(i % 2 ? '#FFFFFF' : '#9BD1FF', glowTexture(), 1, 0.16, 0.16, [Math.cos(t) * 1.3, 0, Math.sin(t) * 1.3]))
  }
  g.add(ring, ring2)
  // Nebula clouds behind.
  g.add(sprite('#3D6FE0', glowTexture(), 0.35, 3.0, 2.2, [-0.3, 1.9, -0.7]), sprite('#8B5CF6', glowTexture(), 0.3, 2.4, 1.8, [0.4, 1.1, -0.75]))
  const shine = radiance(g, a.color, '#9BD1FF', '#FFFFFF')
  const moon = new THREE.Shape()
  moon.absarc(0, 0, 0.16, Math.PI * 0.35, Math.PI * 1.65, false)
  moon.absarc(0.07, 0, 0.13, Math.PI * 1.55, Math.PI * 0.45, true)
  const moonMat = new THREE.MeshBasicMaterial({ color: a.accent, toneMapped: false })
  const moonMesh = mesh(new THREE.ShapeGeometry(moon, 32), moonMat, [0, 3.05, -0.3])
  g.add(moonMesh, sprite(a.accent, glowTexture(), 0.85, 1.3, 1.3, [0, 3.05, -0.32]))
  const twinkles = [[-1.1, 2.6], [1.15, 2.4], [-0.85, 2.95], [0.9, 2.95], [-1.25, 1.9], [1.3, 1.8]].map(([x, y]) => {
    const s = sprite('#FFFFFF', glowTexture(), 1, 0.12, 0.12, [x, y, -0.2])
    g.add(s)
    return s
  })
  return {
    group: g,
    update(t: number) {
      ring.rotation.y = t * 0.35
      ring2.rotation.y = -t * 0.25
      shine(t)
      twinkles.forEach((s, i) => {
        const k = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 1.4)
        s.material.opacity = 0.2 + 0.8 * k
        s.scale.setScalar(0.06 + 0.1 * k)
      })
    },
  }
}

/** Phoenix: a ring of fire turning behind the character, white-hot in the middle. */
function phoenix(a: AuraVisual) {
  const g = new THREE.Group()
  const ring = new THREE.Group()
  ring.position.set(0, 1.45, -0.45)
  const tex = flameTexture()
  const flames: THREE.Sprite[] = []
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * Math.PI * 2
    const f = sprite(i % 2 ? a.accent : i % 3 ? a.color : '#FF4D1A', tex, 1, 0.34, 0.6, [Math.cos(t) * 1.2, Math.sin(t) * 1.2, 0])
    f.material.rotation = t - Math.PI / 2
    flames.push(f)
    ring.add(f)
  }
  ring.add(mesh(new THREE.TorusGeometry(1.2, 0.01, 8, 160), glow(a.accent, 1)))
  ring.add(mesh(new THREE.TorusGeometry(1.2, 0.045, 8, 160), glow(a.color, 0.3)))
  // Inner ring of white-hot flames turning the other way.
  const inner = new THREE.Group()
  inner.position.copy(ring.position)
  const innerFlames: THREE.Sprite[] = []
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2
    const f = sprite(i % 2 ? '#FFF3C4' : a.accent, tex, 0.9, 0.26, 0.42, [Math.cos(t) * 0.85, Math.sin(t) * 0.85, 0.02])
    f.material.rotation = t - Math.PI / 2
    innerFlames.push(f)
    inner.add(f)
  }
  inner.add(mesh(new THREE.TorusGeometry(0.85, 0.006, 8, 128), glow('#FFF3C4', 0.8)))
  g.add(ring, inner, sprite('#FFF3C4', glowTexture(), 0.35, 1.2, 1.2, [0, 1.45, -0.5]))
  const shine = radiance(g, '#FF4D1A', a.color, '#FFB347', 50)
  return {
    group: g,
    update(t: number) {
      ring.rotation.z = t * 0.4
      inner.rotation.z = -t * 0.6
      shine(t)
      flames.forEach((f, i) => {
        const k = 0.85 + 0.25 * Math.sin(t * 9 + i * 1.3)
        f.scale.set(0.34, 0.6 * k, 1)
      })
      innerFlames.forEach((f, i) => {
        const k = 0.85 + 0.25 * Math.sin(t * 11 + i * 1.7)
        f.scale.set(0.26, 0.42 * k, 1)
      })
    },
  }
}

/** Champion: two tilted gold orbits with travelling lights, a rune circle on the floor, a glow behind the head. */
function orbits(a: AuraVisual): { group: THREE.Group; update: (t: number) => void } {
  const g = new THREE.Group()
  const rings: { pivot: THREE.Group; comet: THREE.Sprite; speed: number; trail: THREE.Sprite[] }[] = []
  for (const [tilt, speed] of [[0.32, 1.6], [-0.32, -1.25]] as const) {
    const pivot = new THREE.Group()
    pivot.position.y = 0.62 // around the body, below the head
    pivot.rotation.z = tilt
    const core = mesh(new THREE.TorusGeometry(1.0, 0.008, 8, 200), glow(a.accent, 1))
    const soft = mesh(new THREE.TorusGeometry(1.0, 0.03, 8, 200), glow(a.color, 0.3))
    core.rotation.x = soft.rotation.x = Math.PI / 2
    const comet = sprite(a.accent, glowTexture(), 1, 0.32, 0.32, [1, 0, 0])
    comet.add(sprite('#FFFFFF', glowTexture(), 1, 0.45, 0.45, [0, 0, 0]))
    // A long, fading trail of light behind each comet.
    const trail = Array.from({ length: 12 }, (_, k) => sprite(k % 2 ? '#FFFFFF' : a.accent, glowTexture(), 0.85 - k * 0.065, 0.2 - k * 0.012, 0.2 - k * 0.012, [1, 0, 0]))
    pivot.add(core, soft, comet, ...trail)
    g.add(pivot)
    rings.push({ pivot, comet, speed, trail })
  }

  // Rune circle: gold dashes around the ground ring.
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 10
  for (let i = 0; i < 24; i++) {
    ctx.beginPath()
    ctx.arc(128, 128, 112, (i / 24) * Math.PI * 2, ((i + 0.55) / 24) * Math.PI * 2)
    ctx.stroke()
  }
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(128, 128, 96, 0, Math.PI * 2)
  ctx.stroke()
  const runeTex = new THREE.CanvasTexture(c)
  runeTex.colorSpace = THREE.SRGBColorSpace
  const rune = mesh(new THREE.PlaneGeometry(1.75, 1.75), glow(a.accent, 0.75, runeTex), [0, 0.03, 0])
  rune.rotation.x = -Math.PI / 2
  g.add(rune)

  // Golden glow behind the head, plus the shared shine.
  g.add(sprite(a.accent, glowTexture(), 0.4, 2.0, 1.8, [0, 1.95, -0.42]))
  const shine = radiance(g, a.color, a.accent, a.accent)
  // Twinkling stars around the champion.
  const twinkles = [[-1.15, 2.5], [1.2, 2.2], [-1.3, 1.2], [1.25, 0.9], [-0.7, 2.9], [0.8, 2.95], [0, 3.15]].map(([x, y]) => {
    const s = sprite('#FFFFFF', glowTexture(), 1, 0.12, 0.12, [x, y, -0.2])
    g.add(s)
    return s
  })

  return {
    group: g,
    update(t) {
      for (const { comet, speed, trail } of rings) {
        const angle = t * speed
        comet.position.set(Math.cos(angle), 0, Math.sin(angle))
        trail.forEach((s, k) => {
          const b = angle - Math.sign(speed) * (k + 1) * 0.06
          s.position.set(Math.cos(b), 0, Math.sin(b))
        })
      }
      shine(t)
      twinkles.forEach((s, i) => {
        const k = 0.5 + 0.5 * Math.sin(t * 2.8 + i * 1.6)
        s.material.opacity = 0.15 + 0.85 * k
        s.scale.setScalar(0.05 + 0.13 * k)
      })
      rings[0].pivot.rotation.y = t * 0.15
      rings[1].pivot.rotation.y = -t * 0.12
      rune.rotation.z = t * 0.35
    },
  }
}
