import * as THREE from 'three'
import type { CharacterLook } from '../cosmetics/visuals'
import { buildCharacter, type Pose } from './build'
import { dispose } from './materials'
import { ENVIRONMENT_INTENSITY, FRAMINGS, TONE_MAPPING, addStudioLights, studioEnvironment } from './scene'

// One hidden WebGL renderer turns characters into images, so court cards and lists can show
// many 3D players without opening a WebGL context per avatar.

let renderer: THREE.WebGLRenderer | undefined

function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.toneMapping = TONE_MAPPING
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(1)
  }
  return renderer
}

export type Framing = keyof typeof FRAMINGS

const PIXELS: Record<Framing, [number, number]> = { bust: [240, 264], full: [408, 428] }

/** `time` picks the moment of the pose's animation to capture. */
export function renderCharacter(look: CharacterLook, framing: Framing, pose: Pose = 'idle', time = 0.4): string {
  const r = getRenderer()
  const f = FRAMINGS[framing]
  const [w, h] = PIXELS[framing]
  r.setSize(w, h, false)

  const scene = new THREE.Scene()
  scene.environment = studioEnvironment(r)
  scene.environmentIntensity = ENVIRONMENT_INTENSITY
  addStudioLights(scene)

  const rig = buildCharacter(look, pose, { aura: framing === 'full', paddle: framing === 'full' })
  rig.root.rotation.y = framing === 'bust' ? 0.2 : 0.3
  rig.update(time)
  scene.add(rig.root)

  const camera = new THREE.PerspectiveCamera(f.fov, w / h, 0.1, 50)
  camera.position.set(f.position[0], f.position[1], f.position[2])
  camera.lookAt(f.target[0], f.target[1], f.target[2])
  r.render(scene, camera)
  const url = r.domElement.toDataURL('image/png')
  dispose(rig.root)
  return url
}
