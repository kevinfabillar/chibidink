import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { authApi } from '../api/api'
import { ApiError } from '../api/httpClient'
import type { TokenResponse } from '../api/types'
import { VerifyEmailStep } from '../components/auth/VerifyEmailStep'
import { useAuth } from '../auth/authStore'
import { Button } from '../components/ui/Button'
import { JoinCodeForm } from '../components/session/JoinCodeForm'
import { ErrorNote, Field, Logo } from '../components/ui/primitives'
import { TermsCheckbox } from '../components/ui/TermsCheckbox'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/'
  const navigate = useNavigate()
  const signIn = useAuth((s) => s.signIn)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [agreed, setAgreed] = useState(false)
  // After sign-up (or signing in to an unconfirmed account): the "type your code" step.
  const [verifying, setVerifying] = useState(false)

  const done = (t: TokenResponse) => {
    signIn(t.accessToken, t.expiresIn)
    // Home after signing in; only an invite link (QR / shared /join/CODE) carries on to that session.
    navigate(next.startsWith('/join/') ? next : '/', { replace: true })
  }

  const submit = useMutation({
    mutationFn: async () => {
      if (mode === 'register') {
        await authApi.register(email.trim(), password, displayName, agreed)
        return null
      }
      return authApi.login(email.trim(), password)
    },
    onSuccess: (t) => (t ? done(t) : setVerifying(true)),
    // Right password but email not confirmed yet: the server sent a code, so ask for it.
    onError: (e) => e instanceof ApiError && e.status === 403 && setVerifying(true),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit.mutate()
  }

  const register = mode === 'register'
  const other = register ? '/login' : '/register'

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo large className="h-44" />
        <h1 className="mt-3 font-display text-3xl font-extrabold italic">
          {register ? 'Create your player' : 'Welcome back'}
        </h1>
        <p className="text-sm text-muted">Fair queues for real-life pickleball sessions.</p>
      </div>

      {!next.startsWith('/join/') && (
        <section className="card mb-4 space-y-2.5 p-5">
          <h2 className="font-display text-lg font-bold">Have a session code?</h2>
          <p className="text-sm text-muted">Type the host's code (or scan their QR) to play as a guest. No account needed.</p>
          <JoinCodeForm />
        </section>
      )}

      {verifying ? (
        <VerifyEmailStep email={email.trim()} onVerified={done} onBack={() => (submit.reset(), setVerifying(false))} />
      ) : (
      <form onSubmit={onSubmit} className="card space-y-4 p-5">
        {register && (
          <Field
            label="Player name"
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={24}
            required
            autoComplete="nickname"
          />
        )}
        <Field label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete={register ? 'new-password' : 'current-password'}
          hint={register ? 'At least 8 characters with upper, lower case and a number.' : undefined}
        />
        {register ? (
          <TermsCheckbox checked={agreed} onChange={setAgreed} />
        ) : (
          <Link to="/forgot-password" className="-mt-2 block text-right text-sm font-semibold text-lime hover:underline">
            Forgot password?
          </Link>
        )}
        <ErrorNote error={submit.error} />
        {register && submit.error instanceof ApiError && submit.error.status === 409 && (
          <div className="-mt-1 flex justify-center gap-4 text-sm font-semibold">
            <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-lime hover:underline">
              Sign in instead
            </Link>
            <Link to="/forgot-password" className="text-white/75 hover:text-white">
              Forgot password?
            </Link>
          </div>
        )}
        <Button type="submit" block size="lg" disabled={register && !agreed} loading={submit.isPending}>
          {register ? 'Create account' : 'Sign in'}
        </Button>
      </form>
      )}

      <p className="mt-5 text-center text-sm text-muted">
        {register ? 'Already have an account?' : 'New to ChibiDink?'}{' '}
        <Link to={`${other}?next=${encodeURIComponent(next)}`} className="font-semibold text-lime hover:underline">
          {register ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </div>
  )
}
