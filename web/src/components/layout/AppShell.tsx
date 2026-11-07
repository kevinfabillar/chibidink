import clsx from 'clsx'
import { Backpack, Home, LogOut, PanelLeftClose, PanelLeftOpen, Store, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../auth/authStore'
import { useMe } from '../../hooks/queries'
import { PlayerAvatar } from '../character/Stage'
import { Logo } from '../ui/primitives'

const nav = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/queue', label: 'Queue', icon: Users },
  { to: '/character', label: 'Character', icon: UserRound },
  { to: '/items', label: 'Items', icon: Backpack },
  { to: '/shop', label: 'Shop', icon: Store },
]

const SIDEBAR_KEY = 'cd-sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

/** Inside a session the session pages show their own bottom nav (Courts, Queue, My Games...). */
const isSessionRoute = (path: string) => /^\/sessions\/(?!new\b)[^/]+/.test(path)

export function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const me = useMe().data
  const signOut = useAuth((s) => s.signOut)
  const { pathname } = useLocation()

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1')
      } catch {
        /* storage unavailable */
      }
      return !c
    })
  }

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-white/8 bg-night/80 p-3 backdrop-blur lg:flex',
          collapsed ? 'w-20' : 'w-64',
        )}
      >
        <div className="flex h-20 items-center justify-between px-1">
          {!collapsed && <Logo className="h-16" />}
          <button onClick={toggle} className="rounded-xl p-2 text-white/60 hover:bg-white/8" aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
        </div>
        <nav className="mt-4 flex flex-col gap-1.5">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                clsx(
                  'flex h-12 items-center gap-3 rounded-2xl px-3.5 font-display text-lg font-bold transition',
                  isActive ? 'bg-lime text-ink shadow-[0_0_20px_-6px_rgb(183_243_59/0.9)]' : 'text-white/75 hover:bg-white/8',
                  collapsed && 'justify-center px-0',
                )
              }
            >
              <Icon className="size-5.5 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
        {/* Your profile: tap the card. Sign out sits next to it. */}
        <div className="mt-auto flex items-center gap-1 rounded-2xl border border-white/8 bg-surface/60 p-1.5">
          <NavLink
            to="/profile"
            title="My profile"
            className={({ isActive }) =>
              clsx(
                'flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 transition hover:bg-white/8',
                isActive && 'bg-lime/15 ring-1 ring-lime/60',
                collapsed && 'justify-center',
              )
            }
          >
            {me && <PlayerAvatar player={me.player} size={40} />}
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{me?.player.displayName}</div>
                <div className="text-xs text-muted">Lv {me?.progress.level ?? 1} · My profile</div>
              </div>
            )}
          </NavLink>
          {!collapsed && (
            <>
              <button onClick={signOut} className="rounded-xl p-2 text-white/60 hover:bg-white/8" aria-label="Sign out" title="Sign out">
                <LogOut className="size-4.5" />
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(7rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] md:px-8 md:pt-8 lg:pb-10">
        <Outlet />
      </main>

      {!isSessionRoute(pathname) && <BottomNav items={nav} />}
    </div>
  )
}

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
  active?: boolean
}

/** Phone bottom navigation. The active tab is a lime tile, as in the mockups. */
export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-ink/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md justify-between">
        {items.map(({ to, label, icon: Icon, end, active }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex h-14 w-[19%] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition',
                (active ?? isActive) ? 'bg-lime text-ink shadow-[0_0_18px_-6px_rgb(183_243_59/0.9)]' : 'text-white/75',
              )
            }
          >
            <Icon className="size-5.5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
