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

/** Poses a player can pick on their character; the podium uses champion, cheer and clap. */
export type Pose = 'idle' | 'swing' | 'victory' | 'champion' | 'cheer' | 'clap' | 'dance' | 'flex' | 'spin' | 'serve' | 'bow' | 'jump'

const wx = (x: number) => (x - 300) * S
const ARM = { length: 90 * S, radius: 18 * S, shoulderX: wx(470), shoulderY: wy(352) }

/** Arm angles (radians, around the shoulder; 0 = hanging down). The right arm is raised in the design. */
const POSES: Record<Pose, { right: number; left: number }> = {
  idle: { right: 2.27, left: -0.52 },
  swing: { right: 1.57, left: -0.7 },
  victory: { right: 2.48, left: -0.35 },
  champion: { right: 2.75, left: -2.6 }, // both arms up
  cheer: { right: 2.85, left: -0.6 }, // paddle high, waving
  clap: { right: 1.2, left: -1.2 }, // arms in front
  dance: { right: 2.0, left: -2.0 }, // arms up and swaying
  flex: { right: 1.57, left: -1.57 }, // arms straight out
  spin: { right: 1.45, left: -1.45 }, // arms out, twirling
  serve: { right: 0.2, left: 0.3 }, // underhand serve: paddle low at the side, ball hand in front (animated in serveMotion)
  bow: { right: 0.15, left: -0.15 }, // arms at the sides
  jump: { right: 2.9, left: -2.9 }, // both arms high
}

/** Per-frame motion for each pose: arm swing on top of the base angles, a hop, a sway, a forward lean and a turn. */
function motion(pose: Pose, t: number): { right: number; left: number; hop: number; sway: number; lean?: number; spin?: number } {
  switch (pose) {
    case 'idle':
      return { right: Math.sin(t * 4.8) * 0.16, left: Math.sin(t * 2.2) * 0.03, hop: 0, sway: 0 }
    case 'champion': // jumping with fists pumping
      return { right: Math.sin(t * 7) * 0.18, left: -Math.sin(t * 7) * 0.18, hop: Math.abs(Math.sin(t * 3.5)) * 0.14, sway: 0 }
    case 'cheer': // big wave and a small hop
      return { right: Math.sin(t * 6) * 0.35, left: Math.sin(t * 2.2) * 0.05, hop: Math.abs(Math.sin(t * 3)) * 0.06, sway: Math.sin(t * 3) * 0.04 }
    case 'clap': // arms swinging in and out, side to side
      return { right: Math.sin(t * 9) * 0.22, left: -Math.sin(t * 9) * 0.22, hop: 0, sway: Math.sin(t * 2.4) * 0.06 }
    case 'dance': // arms wave together, hips sway, little bounce
      return { right: Math.sin(t * 5) * 0.5, left: Math.sin(t * 5) * 0.5, hop: Math.abs(Math.sin(t * 5)) * 0.05, sway: Math.sin(t * 5) * 0.09 }
    case 'flex': // arms pumping out to the sides
      return { right: Math.sin(t * 3) * 0.14, left: -Math.sin(t * 3) * 0.14, hop: 0, sway: 0 }
    case 'spin': // twirling on the spot
      return { right: Math.sin(t * 5) * 0.08, left: -Math.sin(t * 5) * 0.08, hop: Math.abs(Math.sin(t * 2.5)) * 0.04, sway: 0, spin: t * 2.5 }
    case 'bow': // a slow, polite bow
      return { right: 0, left: 0, hop: 0, sway: 0, lean: 0.18 + Math.sin(t * 1.6) * 0.14 }
    case 'jump': // big jumps with arms flapping
      return { right: Math.sin(t * 6) * 0.15, left: -Math.sin(t * 6) * 0.15, hop: Math.abs(Math.sin(t * 3)) * 0.3, sway: 0 }
    default:
      return { right: Math.sin(t * 2.2) * 0.03, left: Math.sin(t * 2.2) * 0.03, hop: 0, sway: 0 }
  }
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
  const hat = buildHat(gear, fx)
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

  let held: THREE.Group | null = null
  if (withHeld) {
    held = buildHeld(gear, look.effect, fx)
    // Upright in the design's pose; turns with the arm in others. Serving holds it head-down for an underhand hit.
    held.rotation.z = pose === 'serve' ? Math.PI * 0.8 - p.right : -IDLE.right
    right.hand.add(held)
  }
  const serve = pose === 'serve' ? serveMotion(root, figure, left, right) : null
  const offhand = buildOffhand(gear, fx)
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
      const m = motion(pose, t)
      figure.position.y = Math.sin(t * 2.2) * 0.025 + m.hop
      figure.rotation.z = m.sway
      figure.rotation.x = m.lean ?? 0
      figure.rotation.y = m.spin ?? 0
      head.rotation.z = Math.sin(t * 1.1) * 0.02
      right.pivot.rotation.z = p.right + m.right
      left.pivot.rotation.z = p.left + m.left
      serve?.(t)
      for (const step of fx) step(t)
      premium?.update(t)
      aura?.update(t)
    },
  }
}

const SERVE_SECONDS = 2.4
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const ease = (k: number) => k * k * (3 - 2 * k)

/** Piecewise ease through keyframes [phase, value] (phase 0..1, first at 0, last at 1). */
function keyed(keys: [number, number][], u: number) {
  for (let i = 1; i < keys.length; i++) {
    const [u1, v1] = keys[i]
    const [u0, v0] = keys[i - 1]
    if (u <= u1) return lerp(v0, v1, ease((u - u0) / (u1 - u0)))
  }
  return keys[keys.length - 1][1]
}

/**
 * An underhand pickleball serve on a loop: hold the ball out, swing the paddle back, toss the ball low to the
 * paddle side, swing through and hit it below the waist, follow through high, then the ball arcs away.
 * Arms swing forward/back around x (the poses' z angles keep them at the sides).
 */
function serveMotion(root: THREE.Group, figure: THREE.Group, left: { pivot: THREE.Group; hand: THREE.Group }, right: { pivot: THREE.Group; hand: THREE.Group }) {
  const DROP = 0.38
  const HIT = 0.52
  const GONE = 0.86
  const ball = mesh(new THREE.SphereGeometry(0.065, 20, 14), toy('#E2F542', 0.55, 0.2))
  root.add(ball) // not in the figure, so the body turning doesn't drag the ball along
  const dropFrom = new THREE.Vector3()
  const hitAt = new THREE.Vector3()
  const v = new THREE.Vector3()
  let hasDrop = false

  /** A point in the root's space: the hand, or the paddle's face when there is one. */
  const local = (obj: THREE.Object3D, y = 0) => root.worldToLocal(obj.localToWorld(v.set(0, y, 0)))

  return (t: number) => {
    const u = (t % SERVE_SECONDS) / SERVE_SECONDS
    // Paddle arm (z = out to the side, x = back/forward): back and out on the backswing, low through the ball,
    // then forward and up on the follow-through: a big arc you can see from the front.
    right.pivot.rotation.z = keyed([[0, 0.3], [0.3, 1.3], [DROP, 1.35], [HIT, 0.15], [0.68, 0.55], [0.8, 0.5], [1, 0.3]], u)
    right.pivot.rotation.x = keyed([[0, 0], [0.3, 0.5], [DROP, 0.55], [HIT, -0.45], [0.68, -1.75], [0.8, -1.65], [1, 0]], u)
    // Ball hand: reaches in front of the body, lets go, drops back, comes back with the next ball.
    left.pivot.rotation.z = keyed([[0, 0.6], [0.3, 0.9], [DROP, 0.9], [0.6, 0.1], [0.85, 0.1], [1, 0.6]], u)
    left.pivot.rotation.x = keyed([[0, -0.6], [0.3, -0.9], [DROP, -0.9], [0.6, -0.3], [0.85, -0.3], [1, -0.6]], u)
    // Turns a little into the shot and leans with it.
    figure.rotation.y = keyed([[0, 0], [0.3, -0.3], [HIT, 0], [0.7, 0.2], [1, 0]], u)
    figure.rotation.x = keyed([[0, 0.02], [0.3, 0.06], [HIT, 0.1], [0.7, -0.02], [1, 0.02]], u)
    figure.rotation.z = keyed([[0, 0], [0.3, -0.05], [HIT, 0.03], [0.7, 0.06], [1, 0]], u)
    root.updateMatrixWorld(true)

    if (u < DROP) {
      // In the hand (a fresh ball pops in at the start of each serve).
      ball.position.copy(local(left.hand)).add(v.set(0, 0.05, 0.04))
      ball.scale.setScalar(Math.min(1, u / 0.06))
      dropFrom.copy(ball.position)
      hasDrop = true
    } else if (u < HIT) {
      // Tossed low (under the head, in front of the body) over to the paddle side, meeting the paddle as it swings through.
      if (!hasDrop) dropFrom.copy(local(left.hand))
      const k = (u - DROP) / (HIT - DROP)
      const to = local(right.hand)
      const cx = (dropFrom.x + to.x) / 2
      const cy = Math.min(dropFrom.y, to.y) - 0.35
      const cz = Math.max(dropFrom.z, to.z) + 0.25
      const a = (1 - k) * (1 - k)
      const b = 2 * k * (1 - k)
      const c = k * k
      ball.position.set(a * dropFrom.x + b * cx + c * to.x, a * dropFrom.y + b * cy + c * to.y, a * dropFrom.z + b * cz + c * to.z)
      ball.scale.setScalar(1)
      hitAt.copy(ball.position)
    } else if (u < GONE) {
      // Hit: arcs up and away on the paddle side, shrinking into the distance.
      if (hitAt.lengthSq() === 0) hitAt.copy(local(right.hand))
      const s = (u - HIT) * SERVE_SECONDS
      ball.position.set(hitAt.x + s * 2.0, hitAt.y + s * 2.6 - 4.9 * s * s, hitAt.z + s * 1.2)
      ball.scale.setScalar(1 - ((u - HIT) / (GONE - HIT)) * 0.6)
    } else ball.scale.setScalar(0)
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
