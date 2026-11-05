import { useMutation } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { authApi } from '../api/api'
import type { TokenResponse } from '../api/types'
import { useAuth } from '../auth/authStore'
import { VerifyEmailStep } from '../components/auth/VerifyEmailStep'
import { Logo, Spinner } from '../components/ui/primitives'

/**
 * Opened by the email's "Verify now" button: confirms the email straight away and signs the player in.
 * If the link has expired or was already used, it falls back to typing a (new) code.
 */
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const code = params.get('code') ?? ''
  const navigate = useNavigate()
  const signIn = useAuth((s) => s.signIn)
  const started = useRef(false)

  const done = (t: TokenResponse) => {
    signIn(t.accessToken, t.expiresIn)
    setTimeout(() => navigate('/', { replace: true }), 1200)
  }
  const verify = useMutation({ mutationFn: () => authApi.verifyEmail(email, code), onSuccess: done })

  useEffect(() => {
    if (started.current || !email || !code) return
    started.current = true // once, even in React's double-run development mode
    verify.mutate()
  }, [email, code, verify])

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Logo className="mx-auto mb-6 h-24" />
      {verify.isSuccess ? (
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <CheckCircle2 className="size-12 text-lime" />
          <h1 className="font-display text-2xl font-bold">Email verified!</h1>
          <p className="text-sm text-muted">Your account is ready. Taking you in…</p>
        </div>
      ) : verify.isError || !email || !code ? (
        email ? (
          // Expired or used link: type the code from a newer email instead (or send a new one).
          <VerifyEmailStep email={email} onVerified={done} onBack={() => navigate('/register', { replace: true })} />
        ) : (
          <div className="card space-y-3 p-6 text-center">
            <h1 className="font-display text-2xl font-bold">Link not complete</h1>
            <p className="text-sm text-muted">Open the link straight from the email, or sign in to get a new code.</p>
            <Link to="/login" className="font-semibold text-lime hover:underline">
              Go to sign in
            </Link>
          </div>
        )
      ) : (
        <Spinner label="Verifying your email" />
      )}
    </div>
  )
}
