import * as THREE from 'three'
import type { Appearance } from '../api/types'
import { FACE_RECT, drawFaceShapes, faceShapes, wrapInk } from '../components/character/characterArt'

// Canvas-drawn textures for the 3D character (face, grip, glows).
// The face comes from the shared face shapes, so 2D and 3D faces always match.

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function toTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** The paddle character's face (shared with the 2D avatar), for the front of the 3D head. Transparent around the features. */
export function paddleCharacterFaceTexture(a: Appearance, gear?: string): THREE.Texture {
  const k = 2.4
  const [c, ctx] = makeCanvas(FACE_RECT.w * k, FACE_RECT.h * k)
  ctx.setTransform(k, 0, 0, k, -FACE_RECT.x * k, -FACE_RECT.y * k)
  drawFaceShapes(ctx, faceShapes(a, gear))
  return toTexture(c)
}

/** Grip wrap around the handle (the body). u runs around the handle, v along it. */
export function gripTexture(a: Appearance): THREE.Texture {
  const [c, ctx] = makeCanvas(256, 256)
  ctx.fillStyle = a.gripColor
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = wrapInk(a.gripColor)
  ctx.globalAlpha = 0.22
  ctx.lineCap = 'round'
  const diagonal = (dir: 1 | -1) => {
    ctx.lineWidth = 7
    for (let i = -6; i <= 8; i++) {
      ctx.beginPath()
      ctx.moveTo(i * 40, dir > 0 ? 256 : 0)
      ctx.lineTo(i * 40 + 120, dir > 0 ? 0 : 256)
      ctx.stroke()
    }
  }
  if (a.gripWrap === 'diagonal' || a.gripWrap === 'cross') diagonal(1)
  if (a.gripWrap === 'cross') diagonal(-1)
  if (a.gripWrap === 'stripes') {
    ctx.lineWidth = 14
    for (let y = 20; y < 256; y += 44) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(256, y)
      ctx.stroke()
    }
  }
  return toTexture(c)
}

/** Soft white radial glow; tinted by the material colour. */
export function glowTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(128, 128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return toTexture(c)
}

/** Soft glowing column for auras: bright at the bottom and centre, fading to nothing at every edge. */
export function auraColumnTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(128, 256)
  ctx.save()
  ctx.translate(64, 200)
  ctx.scale(1, 2.6)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 64)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(-64, -80, 128, 160)
  ctx.restore()
  return toTexture(c)
}

/** A soft teardrop flame, white-hot at the base. */
export function flameTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(64, 128)
  const flame = new Path2D('M32 124 C8 118 4 92 18 70 C26 56 28 40 32 6 C36 40 38 56 46 70 C60 92 56 118 32 124 Z')
  // Soft edges via a shadow glow (canvas `filter: blur()` isn't supported in Safari).
  ctx.shadowColor = 'rgba(255,255,255,0.9)'
  ctx.shadowBlur = 10
  const g = ctx.createRadialGradient(32, 104, 2, 32, 90, 60)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fill(flame)
  return toTexture(c)
}

/** A light ray: soft across its width and fading toward its tip. */
export function rayTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(32, 256)
  const across = ctx.createLinearGradient(0, 0, 32, 0)
  across.addColorStop(0, 'rgba(255,255,255,0)')
  across.addColorStop(0.5, 'rgba(255,255,255,1)')
  across.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = across
  ctx.fillRect(0, 0, 32, 256)
  ctx.globalCompositeOperation = 'destination-in'
  const along = ctx.createLinearGradient(0, 0, 0, 256)
  along.addColorStop(0, 'rgba(255,255,255,0)')
  along.addColorStop(0.5, 'rgba(255,255,255,1)')
  along.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = along
  ctx.fillRect(0, 0, 32, 256)
  return toTexture(c)
}
