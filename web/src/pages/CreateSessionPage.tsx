import { CreateSessionForm } from '../components/session/CreateSessionForm'
import { PageTitle } from '../components/ui/primitives'

export function CreateSessionPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle sub="Doubles open play. Players check in with the QR or code you'll get next.">New session</PageTitle>
      <div className="card p-5">
        <CreateSessionForm />
      </div>
    </div>
  )
}
