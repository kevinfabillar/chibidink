import { Home } from 'lucide-react'
import { BottomNav } from '../../components/layout/AppShell'
import { sessionTabs, type SessionTab } from './sessionTabs'

/** Phone bottom nav while inside a session (from the courts mockup). */
export function SessionBottomNav({ sessionId, tab }: { sessionId: string; tab: SessionTab | null }) {
  return (
    <BottomNav
      items={[
        { to: '/', label: 'Home', icon: Home, active: false },
        ...sessionTabs.map((t) => ({ to: `/sessions/${sessionId}?tab=${t.id}`, label: t.label, icon: t.icon, active: t.id === tab })),
      ]}
    />
  )
}
