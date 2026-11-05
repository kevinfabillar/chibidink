import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// One lighting setup for both the live view and snapshots, so characters look the same everywhere.

export const STUDIO_LIGHTS = {
  ambient: 0.25,
  directional: [
    { position: [3, 5, 5] as const, intensity: 1.75, color: '#FFF4E6' }, // warm key
    { position: [-4, 2.5, 3] as const, intensity: 0.7, color: '#DCE7FF' }, // cool fill
    { position: [-2.5, 3, -5] as const, intensity: 2.2, color: '#B57BFF' }, // purple rim
    { position: [3, 2, -4] as const, intensity: 1.2, color: '#C6FF5C' }, // lime rim
  ],
}

export const ENVIRONMENT_INTENSITY = 0.3

/** Keeps skin, hair and kit colours true (ACES washes out bright toy colours). */
export const TONE_MAPPING = THREE.NeutralToneMapping

export function addStudioLights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight('#FFFFFF', STUDIO_LIGHTS.ambient))
  for (const l of STUDIO_LIGHTS.directional) {
    const light = new THREE.DirectionalLight(l.color, l.intensity)
    light.position.set(l.position[0], l.position[1], l.position[2])
    scene.add(light)
  }
}

const environments = new WeakMap<THREE.WebGLRenderer, THREE.Texture>()

/** Soft studio reflections (generated locally; no HDR download). */
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  let env = environments.get(renderer)
  if (!env) {
    const pmrem = new THREE.PMREMGenerator(renderer)
    env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    environments.set(renderer, env)
  }
  return env
}

/** Camera framings shared by the live view and snapshots. */
export const FRAMINGS = {
  // Tall enough for the tallest gear (the wizard hat tip is at y ≈ 3.4).
  full: { aspect: 204 / 214, fov: 30, position: [0, 1.72, 7.2] as const, target: [0, 1.6, 0] as const },
  bust: { aspect: 120 / 132, fov: 30, position: [0, 2.15, 5.05] as const, target: [0, 2.1, 0] as const },
}
