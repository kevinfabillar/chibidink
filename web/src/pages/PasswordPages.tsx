import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, MailCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { authApi } from '../api/api'
import { Button } from '../components/ui/Button'
import { ErrorNote, Field, Logo } from '../components/ui/primitives'

// "Forgot password" (ask for a reset email) and "Set a new password" (from the email's link).

function Frame({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-sm px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10">
      <Logo className="mx-auto h-24" />
      <h1 className="mt-4 text-center font-display text-3xl font-extrabold italic">{title}</h1>
      <p className="mt-1 mb-6 text-center text-sm text-muted">{sub}</p>
      {children}
      <p className="mt-5 text-center text-sm text-muted">
        <Link to="/login" className="font-semibold text-lime hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const send = useMutation({ mutationFn: () => authApi.forgotPassword(email.trim()) })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    send.mutate()
  }

  if (send.isSuccess)
    return (
      <Frame title="Check your email" sub="If an account uses that email, a reset link is on its way.">
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <MailCheck className="size-10 text-lime" />
          <p className="text-sm text-white/85">
            We sent a link to <b>{email.trim()}</b>. It works once, for 1 hour. Not there after a few minutes? Check your spam folder, or try again.
          </p>
          <Button variant="dark" onClick={() => send.reset()}>
            Use a different email
          </Button>
        </div>
      </Frame>
    )

  return (
    <Frame title="Forgot password?" sub="Enter your account's email and we'll send you a link to set a new password.">
      <form onSubmit={submit} className="card space-y-4 p-5">
        <Field label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <ErrorNote error={send.error} />
        <Button type="submit" block size="lg" loading={send.isPending}>
          Send reset link
        </Button>
        <p className="text-xs text-muted">Guest players don't have a password. Join again with the session's QR or code.</p>
      </form>
    </Frame>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const reset = useMutation({ mutationFn: () => authApi.resetPassword(email, token, password) })
  const mismatch = confirm.length > 0 && confirm !== password
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!mismatch) reset.mutate()
  }

  if (!email || !token)
    return (
      <Frame title="Link not complete" sub="This reset link is missing parts. Open it straight from the email, or ask for a new one.">
        <Link to="/forgot-password" className="block">
          <Button block size="lg">Get a new link</Button>
        </Link>
      </Frame>
    )

  if (reset.isSuccess)
    return (
      <Frame title="Password changed" sub="You can sign in with your new password now.">
        <div className="card flex flex-col items-center gap-4 p-6 text-center">
          <CheckCircle2 className="size-10 text-lime" />
          <Link to="/login" className="w-full">
            <Button block size="lg">Sign in</Button>
          </Link>
        </div>
      </Frame>
    )

  return (
    <Frame title="Set a new password" sub={`For ${email}`}>
      <form onSubmit={submit} className="card space-y-4 p-5">
        <Field
          label="New password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          hint="At least 8 characters with upper, lower case and a number."
        />
        <Field label="Type it again" name="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        {mismatch && <p className="text-sm text-danger">The two passwords don't match.</p>}
        <ErrorNote error={reset.error} />
        <Button type="submit" block size="lg" disabled={mismatch} loading={reset.isPending}>
          Save new password
        </Button>
        {reset.error && (
          <Link to="/forgot-password" className="block text-center text-sm font-semibold text-lime hover:underline">
            Get a new reset link
          </Link>
        )}
      </form>
    </Frame>
  )
}
