import { ArrowRight, Crown } from 'lucide-react'
import { Link } from 'react-router'
import { CreateSessionForm } from '../components/session/CreateSessionForm'
import { Button } from '../components/ui/Button'
import { PageTitle, Spinner } from '../components/ui/primitives'
import { useMySessions } from '../hooks/queries'

/** One session at a time: while you host one that isn't closed, this shows it instead of the form. */
export function CreateSessionPage() {
  const sessions = useMySessions()
  if (sessions.isLoading) return <Spinner />
  const current = (sessions.data ?? []).find((s) => s.isOrganizer && s.status !== 'Closed')

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle sub="Doubles open play. Players check in with the QR or code you'll get next.">New session</PageTitle>
      {current ? (
        <div className="card space-y-4 p-5 text-center">
          <Crown className="mx-auto size-8 text-lime" />
          <div>
            <div className="font-display text-xl font-bold">You're already hosting a session</div>
            <p className="mt-1 text-sm text-muted">
              <b className="text-white">{current.title}</b> is {current.status === 'Active' ? 'live' : 'open'}. You can host one session at a time: close it
              (Manage tab → Close session) before starting a new one.
            </p>
          </div>
          <Link to={`/sessions/${current.id}?tab=session`} className="block">
            <Button block size="lg" icon={<ArrowRight className="size-5" />}>
              Go to {current.title}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="card p-5">
          <CreateSessionForm />
        </div>
      )}
    </div>
  )
}
