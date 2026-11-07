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

const key = (userId: string) => `chibidink-pose:${userId}`
const listeners = new Set<() => void>()
const memory = new Map<string, Pose>()

function read(userId: string): Pose {
  try {
    const saved = localStorage.getItem(key(userId))
    if (POSES.some((p) => p.id === saved)) return saved as Pose
  } catch {
    // Storage blocked: fall back to the default pose.
  }
  return 'idle'
}

/** Remembers this account's pose on this device so it stays after leaving the page or reloading. */
export function setPose(userId: string, pose: Pose) {
  try {
    localStorage.setItem(key(userId), pose)
  } catch {
    // Private mode or blocked storage: the pose just lasts for this visit.
  }
  memory.set(userId, pose)
  listeners.forEach((l) => l())
}

/** The account's equipped pose ('idle' until it's known or one is picked). */
export function usePose(userId: string | undefined): Pose {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => {
      if (!userId) return 'idle'
      if (!memory.has(userId)) memory.set(userId, read(userId))
      return memory.get(userId)!
    },
    () => 'idle' as Pose,
  )
}
