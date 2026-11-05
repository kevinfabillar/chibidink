import { Settings, Trophy, Users } from 'lucide-react'

/** The Queue tab holds the courts on top and the line below. */

export type SessionTab = 'courts' | 'games' | 'session'

export const sessionTabs: { id: SessionTab; label: string; icon: typeof Users }[] = [
  { id: 'courts', label: 'Queue', icon: Users },
  { id: 'games', label: 'Standings', icon: Trophy },
  { id: 'session', label: 'Session', icon: Settings },
]
