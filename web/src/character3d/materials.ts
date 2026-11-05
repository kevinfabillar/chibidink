import * as THREE from 'three'

/** Glossy vinyl-toy material. */
export function toy(color: string, roughness = 0.5, clearcoat = 0.3): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat, clearcoatRoughness: 0.35 })
}

/** Additive glow used for effects, auras and the pedestal rim. */
export function glow(color: string, opacity = 0.6, map?: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    map: map ?? null,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
}

export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], position?: [number, number, number]) {
  const m = new THREE.Mesh(geometry, material)
  if (position) m.position.set(...position)
  return m
}

/** Frees GPU memory for everything under `root` (geometries, materials, textures). */
export function dispose(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    m.geometry?.dispose()
    const materials = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
    for (const mat of materials) {
      for (const value of Object.values(mat)) if (value instanceof THREE.Texture) value.dispose()
      mat.dispose()
    }
  })
}
