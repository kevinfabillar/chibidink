import { useSyncExternalStore } from 'react'
import type { Pose } from '../character3d/build'

/** Every pose a player can pick for their character, in menu order. */
export const POSES: { id: Pose; label: string }[] = [
  { id: 'idle', label: 'Ready' },
  { id: 'swing', label: 'Swing' },
  { id: 'victory', label: 'Victory' },
  { id: 'serve', label: 'Serve' },
  { id: 'dance', label: 'Dance' },
  { id: 'flex', label: 'Flex' },
  { id: 'jump', label: 'Jump' },
  { id: 'spin', label: 'Spin' },
  { id: 'bow', label: 'Bow' },
  { id: 'cheer', label: 'Cheer' },
  { id: 'clap', label: 'Clap' },
  { id: 'champion', label: 'Champion' },
]

const KEY = 'chibidink-pose'
const listeners = new Set<() => void>()

function read(): Pose {
  try {
    const saved = localStorage.getItem(KEY)
    if (POSES.some((p) => p.id === saved)) return saved as Pose
  } catch {
    // Storage blocked: fall back to the default pose.
  }
  return 'idle'
}

/** Remembers the chosen pose on this device so it stays after leaving the page or reloading. */
export function setPose(pose: Pose) {
  try {
    localStorage.setItem(KEY, pose)
  } catch {
    // Private mode or blocked storage: the pose just lasts for this visit.
  }
  memory = pose
  listeners.forEach((l) => l())
}

let memory: Pose | null = null

export function usePose(): Pose {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => memory ?? (memory = read()),
    () => 'idle' as Pose,
  )
}
