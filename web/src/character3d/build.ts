import * as THREE from 'three'
import { handleWidth, withDefaults } from '../components/character/characterArt'
import type { CharacterLook, OutfitVisual } from '../cosmetics/visuals'
import { buildAura } from './aura'
import type { EffectUpdate } from './effects'
import { FRONT_Z, HEAD, S, buildBack, buildBodyGear, buildExtras, buildHat, buildOffhand, buildPremium, buildHeld, buildShield, roundedRect, steel, wy } from './gear'
import { buildHair } from './glam'
import { glow, mesh, toy } from './materials'
import { glowTexture, gripTexture, paddleCharacterFaceTexture } from './textures'

// The paddle character (the "Sprout" design) in 3D. Sizes come straight from the design's
// 600 × 770 artwork (see gear.ts for the unit conversion), with the feet on y = 0.

export type Pose = 'idle' | 'swing' | 'victory'

const wx = (x: number) => (x - 300) * S
const ARM = { length: 90 * S, radius: 18 * S, shoulderX: wx(470), shoulderY: wy(352) }

/** Arm angles (radians, around the shoulder; 0 = hanging down). The right arm is raised in the design. */
const POSES: Record<Pose, { right: number; left: number }> = {
  idle: { right: 2.27, left: -0.52 },
  swing: { right: 1.57, left: -0.7 },
  victory: { right: 2.48, left: -0.35 },
}
const IDLE = POSES.idle

export interface CharacterRig {
  root: THREE.Group
  /** Advance idle animation, glows and aura particles to time `t` (seconds). */
  update: (t: number) => void
}

/** A complete 3D character (feet on y = 0, facing +z, about 2.8 units tall). */
export function buildCharacter(look: CharacterLook, pose: Pose = 'idle', opts: { aura?: boolean; paddle?: boolean } = {}): CharacterRig {
  const a = withDefaults(look.appearance)
  const o = look.outfit
  const gear = o.gear
  const knight = gear === 'knight'
  // `paddle: false` (bust snapshots) leaves out the held item, which would stick out of the crop.
  const withHeld = opts.paddle !== false
  const root = new THREE.Group()
  const figure = new THREE.Group()
  root.add(figure)
  const fx: EffectUpdate[] = []

  // ---- Head: the paddle face, with its edge guard on the rim ----
  const head = new THREE.Group()
  head.position.y = HEAD.y
  const b = HEAD.bevel
  const headGeo = new THREE.ExtrudeGeometry(roundedRect(HEAD.w - b * 2, HEAD.h - b * 2, HEAD.r - b), {
    depth: HEAD.depth,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 4,
    curveSegments: 32,
  })
  headGeo.translate(0, 0, -HEAD.depth / 2)
  // The ninja's hood covers the whole head; the face texture paints the eye slit back in.
  head.add(new THREE.Mesh(headGeo, [toy(gear === 'ninja' ? '#262B40' : a.bodyColor, 0.45, 0.35), toy(a.edgeColor, 0.4, 0.3)]))
  const faceMat = new THREE.MeshStandardMaterial({
    map: paddleCharacterFaceTexture(a, gear),
    transparent: true,
    roughness: 0.5,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  })
  head.add(mesh(new THREE.PlaneGeometry(HEAD.w, HEAD.h), faceMat, [0, 0, FRONT_Z + 0.002]))
  figure.add(head)
  if (o.hair) figure.add(buildHair(o.hair))
  const hat = buildHat(gear)
  if (hat) figure.add(hat)

  // ---- Body: the handle, with its wrap and end cap ----
  const r = (handleWidth(a.handleShape) / 2) * S
  const handle = mesh(new THREE.CylinderGeometry(r, r, 180 * S, 8), new THREE.MeshPhysicalMaterial({ map: gripTexture(a), roughness: 0.6, clearcoat: 0.1 }), [0, wy(558), 0])
  handle.rotation.y = Math.PI / 8
  figure.add(handle, endCap(a.endCap, a.endCapColor, r), buildBodyGear(gear, r))
  if (o.cape) figure.add(cape(o.cape))
  const back = buildBack(gear)
  if (back) figure.add(back)
  const extras = buildExtras(gear)
  if (extras) figure.add(extras)
  // Premium skins: the glow and sparkles stay behind; busts leave them out.
  const premium = o.premium && withHeld ? buildPremium(gear, o.premium.aura, o.premium.sparkle) : null
  if (premium) figure.add(premium.group)

  // ---- Legs and feet ----
  for (const side of [-1, 1]) {
    figure.add(mesh(new THREE.CapsuleGeometry(14 * S, 64 * S, 4, 12), toy('#3A3F4B', 0.5, 0.2), [side * 20 * S, wy(666), 0]))
    figure.add(foot(side, o, a.bodyColor, a.shoeColor))
  }

  // ---- Arms, with the outfit's item in the raised hand ----
  const p = POSES[pose]
  const hand = knight ? null : (o.glove ?? '#F4F6F9')
  const left = arm(-1, a.bodyColor, hand)
  const right = arm(1, a.bodyColor, hand)
  left.pivot.rotation.z = p.left
  right.pivot.rotation.z = p.right
  figure.add(left.pivot, right.pivot)

  if (withHeld) {
    const held = buildHeld(gear, look.effect, fx)
    held.rotation.z = -IDLE.right // upright in the design's pose; turns with the arm in others
    right.hand.add(held)
  }
  const offhand = buildOffhand(gear)
  if (offhand) {
    offhand.rotation.z += -p.left
    left.hand.add(offhand)
  }
  if (knight) {
    const shield = buildShield(look.effect, fx)
    shield.rotation.z = -p.left
    shield.position.set(0.04, -0.08, 0.2)
    left.hand.add(shield)
  }

  // Soft contact shadow under the feet.
  const shadow = mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ color: '#000000', alphaMap: glowTexture(), transparent: true, opacity: 0.55, depthWrite: false }), [0, 0.006, 0.02])
  shadow.rotation.x = -Math.PI / 2
  root.add(shadow)

  const aura = opts.aura !== false && look.aura ? buildAura(look.aura) : null
  if (aura) root.add(aura.group)

  return {
    root,
    update(t) {
      figure.position.y = Math.sin(t * 2.2) * 0.025
      head.rotation.z = Math.sin(t * 1.1) * 0.02
      right.pivot.rotation.z = p.right + (pose === 'idle' ? Math.sin(t * 4.8) * 0.16 : Math.sin(t * 2.2) * 0.03)
      left.pivot.rotation.z = p.left + Math.sin(t * 2.2) * 0.03
      for (const step of fx) step(t)
      premium?.update(t)
      aura?.update(t)
    },
  }
}

/** `gloveColor` is null for the knight's steel gauntlets. */
function arm(side: -1 | 1, color: string, gloveColor: string | null) {
  const pivot = new THREE.Group()
  pivot.position.set(side * ARM.shoulderX, ARM.shoulderY, 0)
  pivot.add(mesh(new THREE.CapsuleGeometry(ARM.radius, ARM.length - ARM.radius * 2, 4, 12), toy(color, 0.45, 0.35), [0, -ARM.length / 2, 0]))
  const hand = new THREE.Group()
  hand.position.y = -ARM.length
  hand.add(mesh(new THREE.SphereGeometry(gloveColor ? 0.078 : 0.081, 20, 14), gloveColor ? toy(gloveColor, 0.5, 0.3) : steel()))
  pivot.add(hand)
  return { pivot, hand }
}

function foot(side: number, o: OutfitVisual, body: string, shoeColor?: string) {
  const g = new THREE.Group()
  g.position.set(side * 28 * S, 0, 0.04)
  if (o.gear === 'knight') {
    const boot = mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), steel())
    boot.scale.set(0.12, 0.11, 0.16)
    g.add(boot)
    return g
  }
  const shoe = mesh(new THREE.SphereGeometry(1, 24, 16), toy(shoeColor || o.shoes, 0.45, 0.4), [0, 0.085, 0])
  shoe.scale.set(0.126, 0.078, 0.16)
  const sole = mesh(new THREE.SphereGeometry(1, 24, 12), toy(o.sole ?? body, 0.5, 0.2), [0, 0.035, 0])
  sole.scale.set(0.13, 0.032, 0.165)
  g.add(shoe, sole)
  return g
}

function endCap(kind: string, color: string, r: number) {
  const y = wy(647)
  if (kind === 'ball') return mesh(new THREE.SphereGeometry(0.075, 24, 16), toy('#D8EE3A', 0.5, 0.3), [0, wy(654), 0])
  const cap = new THREE.Group()
  const metal = new THREE.MeshPhysicalMaterial({ color: '#D9AE4A', metalness: 0.9, roughness: 0.3 })
  const steelMat = new THREE.MeshPhysicalMaterial({ color: '#C9D1DC', metalness: 0.85, roughness: 0.25 })
  const coloured = toy(color, 0.45, 0.4)
  const shiny = new THREE.MeshPhysicalMaterial({ color, roughness: 0.15, clearcoat: 1, metalness: 0.1 })
  switch (kind) {
    case 'pommel':
      cap.add(mesh(new THREE.CylinderGeometry(r + 0.022, r + 0.022, 0.085, 16), metal, [0, y, 0]))
      cap.add(mesh(new THREE.SphereGeometry(0.026, 12, 10), toy(color === '#1A1D24' ? '#D93A45' : color, 0.2, 0.8), [0, y, r + 0.03]))
      break
    case 'flat': {
      // A square block, wider than the handle (4-sided "cylinder" turned 45°).
      const block = mesh(new THREE.CylinderGeometry((r + 0.05) * Math.SQRT2, (r + 0.05) * Math.SQRT2, 0.11, 4), coloured, [0, y, 0])
      block.rotation.y = Math.PI / 4
      cap.add(block)
      break
    }
    case 'ring':
      cap.add(mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.03, 24), steelMat, [0, wy(630), 0]))
      cap.add(mesh(new THREE.CylinderGeometry(r + 0.022, r + 0.022, 0.08, 16), coloured, [0, y, 0]))
      break
    case 'gem': {
      cap.add(mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.05, 16), metal, [0, wy(639), 0]))
      // In front of the legs, so it shows.
      const gem = mesh(new THREE.OctahedronGeometry(0.11, 0), shiny, [0, wy(672), 0.09])
      gem.scale.set(0.95, 1.3, 0.7)
      cap.add(gem)
      break
    }
    case 'star': {
      const st = new THREE.Shape()
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? 0.07 : 0.17
        const t = (i / 10) * Math.PI * 2
        if (i === 0) st.moveTo(Math.sin(t) * rr, Math.cos(t) * rr)
        else st.lineTo(Math.sin(t) * rr, Math.cos(t) * rr)
      }
      st.closePath()
      const geo = new THREE.ExtrudeGeometry(st, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 })
      geo.translate(0, 0, -0.015)
      cap.add(mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.05, 16), toy('#1A1D24', 0.5, 0.2), [0, wy(637), 0]))
      // In front of the legs, so it shows.
      cap.add(mesh(geo, shiny, [0, wy(668), 0.1]))
      break
    }
    default: // round
      cap.add(mesh(new THREE.CylinderGeometry(r + 0.022, r + 0.022, 0.085, 16), coloured, [0, y, 0]))
  }
  return cap
}

function cape(color: string) {
  const h = (712 - 380) * S
  const geo = new THREE.CylinderGeometry(0.45, 0.62, h, 28, 1, true, Math.PI * 0.62, Math.PI * 0.76)
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.7, side: THREE.DoubleSide })
  return mesh(geo, m, [0, wy(546), -0.04])
}

/** Dark display disc with a glowing purple rim (the mockup's character stand). */
export function buildPedestal(color = '#A348FA'): THREE.Group {
  const g = new THREE.Group()
  g.add(mesh(new THREE.CylinderGeometry(1.05, 1.12, 0.16, 64), toy('#211735', 0.35, 0.6), [0, -0.08, 0]))
  g.add(mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.012, 64), toy('#2D2150', 0.3, 0.8), [0, 0.002, 0]))
  const rim = mesh(new THREE.TorusGeometry(1.03, 0.024, 10, 96), glow(color, 1), [0, 0.004, 0])
  rim.rotation.x = Math.PI / 2
  const inner = mesh(new THREE.TorusGeometry(0.74, 0.01, 8, 96), glow(color, 0.55), [0, 0.01, 0])
  inner.rotation.x = Math.PI / 2
  const halo = mesh(new THREE.CircleGeometry(1.7, 48), glow(color, 0.4, glowTexture()), [0, -0.15, 0])
  halo.rotation.x = -Math.PI / 2
  g.add(rim, inner, halo)
  return g
}
