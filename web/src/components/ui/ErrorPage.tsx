import { Home, LogIn, RotateCcw } from 'lucide-react'
import { Component, type ReactNode } from 'react'
import { useAuth } from '../../auth/authStore'
import { mascotLook } from '../../cosmetics/visuals'
import { errorKind, type ErrorKind } from '../../lib/errors'
import { ChibiAvatar } from '../character/ChibiAvatar'
import { Button } from './Button'

// Full-page error states. Every message is written for players: no codes from the server, no stack
// traces, no technical details. Each page offers the one action that helps.

const TEXT: Record<ErrorKind, { code: string; title: string; body: string }> = {
  notFound: { code: '404', title: 'Out of bounds!', body: "We couldn't find that page. The link may be wrong, or the session was deleted." },
  unauthorized: { code: '401', title: 'Please sign in', body: 'Your sign-in has expired or you signed out. Sign in again to continue.' },
  forbidden: { code: '403', title: 'Not your court', body: "You don't have access to this. If it's a session, join it with its code or QR first." },
  server: { code: '500', title: 'Our side tripped', body: "ChibiDink is having trouble right now. It's not you. Please try again in a moment." },
  offline: { code: 'Offline', title: "Can't reach ChibiDink", body: 'Check your internet connection, then try again.' },
  crash: { code: 'Oops', title: 'Something went wrong', body: 'The app hit an unexpected problem. Reloading usually fixes it.' },
}

/** Retry is offered where trying again can help; sign-in where the session expired. */
export function ErrorPage({ kind = 'notFound', onRetry }: { kind?: ErrorKind; onRetry?: () => void }) {
  const t = TEXT[kind]
  const retry = kind === 'server' || kind === 'offline' || kind === 'crash' ? (onRetry ?? (() => location.reload())) : undefined
  const signIn = () => {
    useAuth.getState().signOut()
    location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`
  }
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-4 py-10 text-center" role="alert">
      <ChibiAvatar look={mascotLook} variant="full" pose={kind === 'notFound' ? 'swing' : 'idle'} className="w-40" title="ChibiDink mascot" />
      <div className="mt-2 font-display text-5xl font-extrabold text-lime">{t.code}</div>
      <h1 className="mt-1 font-display text-2xl font-bold">{t.title}</h1>
      <p className="mt-2 text-sm text-muted">{t.body}</p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        {retry && (
          <Button size="lg" icon={<RotateCcw className="size-5" />} onClick={retry}>
            {kind === 'crash' ? 'Reload' : 'Try again'}
          </Button>
        )}
        {kind === 'unauthorized' && (
          <Button size="lg" icon={<LogIn className="size-5" />} onClick={signIn}>
            Sign in
          </Button>
        )}
        {/* A plain link (not the router), so it also works after a crash. */}
        <a href="/" className="inline-flex">
          <Button variant="dark" size="lg" block icon={<Home className="size-5" />}>
            Go home
          </Button>
        </a>
      </div>
    </div>
  )
}

/** The right error page for a failed page load (from the request's error). */
export function PageError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const kind = errorKind(error)
  // A failed load that isn't an API error is still a loading problem, not an app crash.
  return <ErrorPage kind={kind === 'crash' ? 'server' : kind} onRetry={onRetry} />
}

/** Catches crashes anywhere in the app and shows the error page instead of a blank screen. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(error: unknown) {
    // Kept in the browser console for debugging; never shown on the page.
    console.error('App crashed:', error)
  }

  render() {
    return this.state.crashed ? <ErrorPage kind="crash" /> : this.props.children
  }
}
