import { useMutation } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { authApi } from '../../api/api'
import type { TokenResponse } from '../../api/types'
import { Button } from '../ui/Button'
import { ErrorNote } from '../ui/primitives'

/**
 * Step 2 of sign-up: type the 6-digit code from the email. On success the player is signed in.
 * Also used when someone signs in to an account whose email isn't confirmed yet.
 */
export function VerifyEmailStep({ email, onVerified, onBack }: { email: string; onVerified: (t: TokenResponse) => void; onBack: () => void }) {
  const [code, setCode] = useState('')
  const [wait, setWait] = useState(30) // seconds before "Send a new code" is allowed
  const digits = code.replace(/\D/g, '').slice(0, 6)

  const verify = useMutation({ mutationFn: () => authApi.verifyEmail(email, digits), onSuccess: onVerified })
  const resend = useMutation({ mutationFn: () => authApi.resendVerification(email), onSuccess: () => setWait(30) })

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (digits.length === 6) verify.mutate()
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5 text-center">
      <MailCheck className="mx-auto size-10 text-lime" />
      <div>
        <h2 className="font-display text-2xl font-bold">Check your email</h2>
        <p className="mt-1 text-sm text-muted">
          We sent an email to <b className="text-white">{email}</b>. Tap <b className="text-white">Verify now</b> in it, or type its 6-digit code here.
        </p>
      </div>
      <input
        value={digits}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="••••••"
        aria-label="6-digit code"
        autoFocus
        className="h-16 w-full rounded-2xl border border-white/10 bg-night text-center font-display text-4xl font-extrabold tracking-[0.5em] text-lime placeholder:text-white/20 focus:border-lime/70 focus:outline-none"
      />
      <ErrorNote error={verify.error ?? resend.error} />
      <Button type="submit" block size="lg" disabled={digits.length !== 6} loading={verify.isPending}>
        Verify and continue
      </Button>
      <p className="text-xs text-muted">Not there? Check Spam or Promotions. The code works for about 10 minutes.</p>
      <div className="flex items-center justify-center gap-4 text-sm">
        <button type="button" disabled={wait > 0 || resend.isPending} onClick={() => resend.mutate()} className="font-semibold text-lime disabled:text-white/40">
          {wait > 0 ? `Send a new code (${wait}s)` : resend.isPending ? 'Sending…' : 'Send a new code'}
        </button>
        <button type="button" onClick={onBack} className="font-semibold text-white/70 hover:text-white">
          Wrong email?
        </button>
      </div>
    </form>
  )
}
