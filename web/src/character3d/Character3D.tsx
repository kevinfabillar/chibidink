import { AdaptiveDpr, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import type { CharacterLook } from '../cosmetics/visuals'
import { buildCharacter, buildPedestal, type CharacterRig, type Pose } from './build'
import { dispose } from './materials'
import { ENVIRONMENT_INTENSITY, FRAMINGS, STUDIO_LIGHTS, TONE_MAPPING, studioEnvironment } from './scene'

export interface Character3DProps {
  look: CharacterLook
  pose?: Pose
  /** Drag to spin the character. */
  interactive?: boolean
  pedestal?: boolean
  /** Starting turn (radians) so the character isn't flat-on. */
  turn?: number
}

/** Live, animated 3D character. Loaded lazily (three.js is large). */
export default function Character3D({ look, pose = 'idle', interactive, pedestal, turn = 0.3 }: Character3DProps) {
  const key = `${pose}|${JSON.stringify(look)}`
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures look + pose
  const rig = useMemo(() => buildCharacter(look, pose), [key])
  useEffect(() => () => dispose(rig.root), [rig])
  const stand = useMemo(() => (pedestal ? buildPedestal() : null), [pedestal])
  useEffect(() => () => void (stand && dispose(stand)), [stand])

  const f = FRAMINGS.full
  return (
    <Canvas
      dpr={[1, 1.5]}
      // While you drag, the view renders at a lower resolution (unnoticeable in motion) so it keeps up on
      // phones; it sharpens again a moment after you let go. The shiny materials cost per pixel, so this
      // is where the time goes.
      performance={{ min: 0.55, debounce: 300 }}
      camera={{ fov: f.fov, position: [...f.position] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ camera, gl, scene }) => {
        camera.lookAt(...f.target)
        gl.toneMapping = TONE_MAPPING
        scene.environment = studioEnvironment(gl)
        scene.environmentIntensity = ENVIRONMENT_INTENSITY
      }}
      style={{ touchAction: interactive ? 'pan-y' : 'auto' }} // swipe up/down scrolls the page; drag sideways spins
    >
      <StudioLights />
      <group rotation-y={turn}>
        <primitive object={rig.root} />
      </group>
      {stand && <primitive object={stand} />}
      <Animator rig={rig} />
      {interactive && (
        <>
          <AdaptiveDpr />
          {/* Damping: the turn eases out and glides to a stop instead of halting the instant you let go. */}
          <OrbitControls
            target={[...f.target]}
            enablePan={false}
            enableZoom={false}
            minPolarAngle={1.2}
            maxPolarAngle={1.7}
            rotateSpeed={0.7}
            enableDamping
            dampingFactor={0.09}
            regress
          />
        </>
      )}
    </Canvas>
  )
}

function StudioLights() {
  return (
    <>
      <ambientLight intensity={STUDIO_LIGHTS.ambient} />
      {STUDIO_LIGHTS.directional.map((l) => (
        <directionalLight key={l.color} position={[...l.position]} intensity={l.intensity} color={l.color} />
      ))}
    </>
  )
}

function Animator({ rig }: { rig: CharacterRig }) {
  useFrame(({ clock }) => rig.update(clock.elapsedTime))
  return null
}
