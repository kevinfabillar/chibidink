import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  expiresAt: number | null
  /** Signed in as a guest from a session QR (can join, can't host). */
  guest: boolean
  signIn: (token: string, expiresInSeconds: number, guest?: boolean) => void
  signOut: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      expiresAt: null,
      guest: false,
      signIn: (token, expiresIn, guest = false) => set({ token, expiresAt: Date.now() + expiresIn * 1000, guest }),
      signOut: () => set({ token: null, expiresAt: null, guest: false }),
    }),
    { name: 'chibidink-auth' },
  ),
)

/** Current token, or null once it has expired. */
export function currentToken(): string | null {
  const { token, expiresAt } = useAuth.getState()
  return token && expiresAt && expiresAt > Date.now() ? token : null
}
