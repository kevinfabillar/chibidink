import { Component, lazy, Suspense, useEffect, useReducer, type ReactNode } from 'react'
import type { Pose } from '../../character3d/build'
import { peekSnapshot, requestSnapshot } from '../../character3d/snapshotCache'
import type { CharacterLook } from '../../cosmetics/visuals'
import { ChibiAvatar } from './ChibiAvatar'

/** The drawn fallback (no WebGL) has the three everyday poses; celebrations map onto them. */
const drawnPose = (pose: Pose) => (pose === 'champion' || pose === 'cheer' ? 'victory' : pose === 'clap' ? 'idle' : pose)

const Character3D = lazy(() => import('../../character3d/Character3D'))

const RATIO = { bust: 132 / 120, full: 214 / 204 }

export interface Avatar3DProps {
  look: CharacterLook
  variant?: 'bust' | 'full'
  pose?: Pose
  /** Live animated 3D canvas (full body only). Otherwise a rendered 3D image. */
  live?: boolean
  /** Drag to spin (live only). */
  interactive?: boolean
  /** Glowing display disc under a live character. */
  pedestal?: boolean
  /** Idle float on the drawn fallback. */
  animated?: boolean
  size?: number
  flip?: boolean
  className?: string
  title?: string
}

/**
 * The player's 3D character. Shows the drawn version immediately, then swaps in 3D
 * (a live canvas or a cached snapshot image). Falls back to the drawing if WebGL is unavailable.
 */
export function Avatar3D({ look, variant = 'bust', pose = 'idle', live, interactive, pedestal, animated, size, flip, className, title }: Avatar3DProps) {
  if (live && variant === 'full') {
    const drawn = <ChibiAvatar look={look} variant="full" pose={drawnPose(pose)} animated={animated} className="size-full" title={title} />
    return (
      <div className={className} style={{ aspectRatio: '204 / 214', width: size }} role="img" aria-label={title ?? 'Player character'}>
        <WebGLBoundary fallback={drawn}>
          <Suspense fallback={drawn}>
            <Character3D look={look} pose={pose} interactive={interactive} pedestal={pedestal} />
          </Suspense>
        </WebGLBoundary>
      </div>
    )
  }

  const drawn = <ChibiAvatar look={look} variant={variant} pose={drawnPose(pose)} animated={animated} size={size} flip={flip} className={className} title={title} />
  return <Snapshot look={look} variant={variant} pose={pose} size={size} flip={flip} className={className} title={title} fallback={drawn} />
}

function Snapshot({
  look,
  variant,
  pose,
  size,
  flip,
  className,
  title,
  fallback,
}: {
  look: CharacterLook
  variant: 'bust' | 'full'
  pose: Pose
  size?: number
  flip?: boolean
  className?: string
  title?: string
  fallback: ReactNode
}) {
  const key = `${variant}|${pose}|${JSON.stringify(look)}`
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const url = peekSnapshot(key)

  useEffect(() => {
    if (peekSnapshot(key)) return
    let alive = true
    requestSnapshot(key, () => import('../../character3d/snapshot').then((m) => m.renderCharacter(look, variant, pose)))
      .then(() => alive && rerender())
      .catch(() => undefined) // keep the drawn version
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures look, variant and pose
  }, [key])

  if (!url) return <>{fallback}</>
  return (
    <img
      src={url}
      alt={title ?? 'Player character'}
      draggable={false}
      width={size}
      height={size ? Math.round(size * RATIO[variant]) : undefined}
      className={className}
      style={{ ...(size ? null : { height: 'auto' }), ...(flip ? { transform: 'scaleX(-1)' } : null) }}
    />
  )
}

class WebGLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
