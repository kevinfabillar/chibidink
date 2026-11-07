import clsx from 'clsx'
import { Bell, ChevronLeft, Moon, Plus, Sun, UserPlus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useCosmetics, useMe } from '../../hooks/queries'
import { matchStatusLabel } from '../../lib/format'
import { setTheme, useTheme } from '../../lib/theme'
import { PlayerAvatar } from '../character/Stage'
import { Button } from './Button'
import { CoinIcon } from './icons'
import { Logo } from './primitives'
import { Sheet } from './Sheet'

interface Props {
  title?: ReactNode
  sub?: ReactNode
  /** Path for the back arrow. */
  back?: string
  /** Show the ChibiDink logo instead of a title (home). */
  logo?: boolean
}

/** Page header from the mockups: title or logo on the left, coins and the bell on the right. */
export function TopBar({ title, sub, back, logo }: Props) {
  return (
    <header className="mb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {back && (
            <Link to={back} className="-ml-2 rounded-full p-1.5 text-white/85 hover:bg-white/10" aria-label="Back">
              <ChevronLeft className="size-7" />
            </Link>
          )}
          {logo ? (
            <Logo className="h-16" />
          ) : (
            <h1 className="truncate font-display text-[1.4rem] leading-none font-extrabold italic min-[400px]:text-[1.7rem] md:text-4xl">{title}</h1>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 min-[400px]:gap-2">
          <CoinPill />
          <ThemeToggle />
          <AlertBell />
          <AccountButton />
        </div>
      </div>
      {sub && <p className="mt-1.5 text-sm text-white/75">{sub}</p>}
    </header>
  )
}

/** Sun / moon button: switches light and dark mode, remembered on this device. */
export function ThemeToggle() {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="grid size-9 place-items-center rounded-full text-white/90 hover:bg-white/10"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <Sun className="size-5.5" /> : <Moon className="size-5.5" />}
    </button>
  )
}

export function CoinPill() {
  const coins = useMe().data?.progress.coins ?? 0
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-ink/70 pr-1 pl-1 hover:border-white/25 light:bg-surface"
        aria-label={`${coins} coins. How to earn more`}
      >
        <CoinIcon className="size-6" />
        <span className="font-display text-base font-bold tabular-nums">{coins.toLocaleString()}</span>
        <span className="grid size-6 place-items-center rounded-full bg-lime text-ink">
          <Plus className="size-4" strokeWidth={3} />
        </span>
      </button>
      <EarnCoinsSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function EarnCoinsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rules = useCosmetics(open).data?.rewards
  const rows = rules
    ? [
        ['Verified match', `+${rules.matchCoins}`, `+${rules.matchExperience} XP`],
        ['Verified win (extra)', `+${rules.winCoins}`, `+${rules.winExperience} XP`],
        ['Welcome bonus', `+${rules.welcomeCoins}`, 'once'],
      ]
    : []
  return (
    <Sheet open={open} onClose={onClose} title="Earn coins">
      <p className="mb-4 text-sm text-muted">Coins come from real pickleball. There's nothing to buy with real money.</p>
      <ul className="space-y-2">
        {rows.map(([label, coins, xp]) => (
          <li key={label} className="flex items-center justify-between rounded-2xl bg-night/70 px-4 py-3">
            <span className="font-semibold">{label}</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-display text-lg font-bold">
                <CoinIcon className="size-5" />
                {coins}
              </span>
              <span className="w-16 text-right text-sm text-lime">{xp}</span>
            </span>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

/** Red badge when your current match needs you (confirm, head to court, or verify the score). */
/** Your character's face, opening your profile and Sign out (the desktop sidebar's profile card does the same). */
function AccountButton() {
  const player = useMe().data?.player
  if (!player) return null
  return (
    <Link to="/profile" className="grid size-10 place-items-center overflow-hidden rounded-full border border-white/15 bg-surface-2" aria-label="My profile and sign out">
      <PlayerAvatar player={player} size={44} />
    </Link>
  )
}

export function AlertBell() {
  const me = useMe().data
  const active = me?.activeMatch
  const requests = me?.friendRequests ?? 0
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const label = active?.needsAction ? 'Your match needs you' : requests ? `${requests} friend request${requests === 1 ? '' : 's'}` : 'Notifications'
  return (
    <>
      <button
        // A match that needs you goes straight to it; otherwise the list.
        onClick={() => (active?.needsAction ? navigate(`/sessions/${active.sessionId}?tab=games`) : setOpen(true))}
        className="relative grid size-9 place-items-center rounded-full text-white/90 hover:bg-white/10"
        aria-label={label}
        title={active ? `Court ${active.courtNumber}: ${matchStatusLabel[active.status]}` : undefined}
      >
        <Bell className="size-6" />
        {(active || requests > 0) && (
          <span
            className={clsx(
              'absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full px-1 text-[11px] leading-4.5 font-bold',
              active?.needsAction || requests ? 'bg-danger text-snow' : 'size-2.5 min-w-0 bg-lime p-0',
            )}
          >
            {(active?.needsAction ? 1 : 0) + requests || ''}
          </span>
        )}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Notifications">
        <div className="space-y-2">
          {active && (
            <Link
              to={`/sessions/${active.sessionId}?tab=games`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl bg-night/70 p-3 hover:bg-night"
            >
              <Bell className="size-5 shrink-0 text-lime" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Court {active.courtNumber}: {matchStatusLabel[active.status]}</span>
                <span className="block truncate text-sm text-muted">{active.sessionTitle}</span>
              </span>
            </Link>
          )}
          {requests > 0 && (
            <Link to="/friends" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl bg-night/70 p-3 hover:bg-night">
              <UserPlus className="size-5 shrink-0 text-lime" />
              <span className="min-w-0 flex-1 font-semibold">
                {requests} friend request{requests === 1 ? '' : 's'}
              </span>
              <span className="text-sm font-semibold text-lime">See</span>
            </Link>
          )}
          {!active && requests === 0 && <p className="mb-2 text-white/75">You're all caught up. When you're put on a court or someone adds you as a friend, you'll see it here.</p>}
        </div>
        <Button block variant="dark" className="mt-4" onClick={() => setOpen(false)}>
          OK
        </Button>
      </Sheet>
    </>
  )
}

/** Lime filter chips under page titles (All, Tops, Sets...). */
export function Chips<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="tablist">
      {options.map((o) => (
        <button
          key={o}
          role="tab"
          aria-selected={o === value}
          onClick={() => onChange(o)}
          className={clsx(
            'h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition',
            o === value ? 'border-lime bg-lime text-ink shadow-[0_0_14px_-4px_rgb(183_243_59/0.9)]' : 'border-white/12 bg-surface/80 text-white/85 hover:border-white/30',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
