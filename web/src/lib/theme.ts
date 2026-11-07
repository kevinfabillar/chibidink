import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

const KEY = 'chibidink-theme'
const META = { dark: '#070C14', light: '#F3F6FA' } as const
const listeners = new Set<() => void>()

/** The saved choice; dark (the app's look) when nothing is saved or storage is blocked. */
function current(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

/** Applies a theme to the page and remembers it on this device. index.html applies the saved one before first paint. */
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[theme])
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Private mode or blocked storage: the choice just lasts for this visit.
  }
  listeners.forEach((l) => l())
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    current,
    () => 'dark',
  )
}
