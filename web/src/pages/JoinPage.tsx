import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, MapPin, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { useState } from 'react'
import { authApi, inviteApi } from '../api/api'
import { useAuth } from '../auth/authStore'
import { Button } from '../components/ui/Button'
import { ErrorNote, Field, Logo, Spinner } from '../components/ui/primitives'
import { queryKeys } from '../hooks/queries'
import { dateTimeText } from '../lib/format'
import { TermsCheckbox } from '../components/ui/TermsCheckbox'

/** Landing page for invite links and QR codes: play as a guest with just a name, or with an account. */
export function JoinPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signedIn = !!useAuth((s) => s.token)
  const signIn = useAuth((s) => s.signIn)
  const [name, setName] = useState('')
  const [agreed, setAgreed] = useState(false)

  const preview = useQuery({ queryKey: ['invite', code], queryFn: () => inviteApi.preview(code), retry: false })
  const join = useMutation({
    mutationFn: () => inviteApi.join(code),
    onSuccess: ({ sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.mySessions })
      navigate(`/sessions/${sessionId}?tab=courts`, { replace: true })
    },
  })

  // Guest: make a guest account from the name, then check in with the same code.
  const guest = useMutation({
    mutationFn: async () => {
      const token = await authApi.guest(code, name.trim(), agreed)
      signIn(token.accessToken, token.expiresIn, true)
      return inviteApi.join(code)
    },
    onSuccess: ({ sessionId }) => {
      void queryClient.invalidateQueries()
      navigate(`/sessions/${sessionId}?tab=courts`, { replace: true })
    },
  })

  const next = encodeURIComponent(`/join/${code}`)

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center px-4 py-10">
      <Logo large className="mx-auto mb-4 h-36" />
      {preview.isLoading && <Spinner label="Finding session" />}
      {preview.error && <ErrorNote error={new Error(`No session found for code ${code}.`)} />}
      {preview.data && (
        <div className="card shadow-glow-lime p-6 text-center">
          <p className="text-sm font-semibold tracking-widest text-lime uppercase">You're invited</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold italic">{preview.data.title}</h1>
          <p className="text-sm text-muted">Hosted by {preview.data.organizerName}</p>
          <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-white/85">
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-lime" />
              {preview.data.location}
            </li>
            <li className="flex items-center gap-2">
              <Calendar className="size-4 text-lime" />
              {dateTimeText(preview.data.scheduledAt)}
            </li>
            <li className="flex items-center gap-2">
              <Users className="size-4 text-lime" />
              {preview.data.courtCount} courts · Doubles · {preview.data.playerCount} checked in
            </li>
          </ul>
          <div className="mt-6 space-y-3">
            {preview.data.status === 'Closed' ? (
              <p className="text-muted">This session has ended.</p>
            ) : signedIn ? (
              <Button block size="lg" loading={join.isPending} onClick={() => join.mutate()}>
                Join session
              </Button>
            ) : (
              <>
                <form
                  className="space-y-3 text-left"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (name.trim() && agreed) guest.mutate()
                  }}
                >
                  <Field label="Your name" name="guestName" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="What should we call you?" autoComplete="nickname" />
                  <TermsCheckbox checked={agreed} onChange={setAgreed} />
                  <Button type="submit" block size="lg" disabled={!name.trim() || !agreed} loading={guest.isPending}>
                    Play as guest
                  </Button>
                  <ErrorNote error={guest.error} />
                </form>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-px flex-1 bg-white/10" /> or keep your character and coins <span className="h-px flex-1 bg-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="dark" onClick={() => navigate(`/register?next=${next}`)}>
                    Create account
                  </Button>
                  <Button variant="dark" onClick={() => navigate(`/login?next=${next}`)}>
                    Sign in
                  </Button>
                </div>
              </>
            )}
            <ErrorNote error={join.error} />
          </div>
        </div>
      )}
    </div>
  )
}
