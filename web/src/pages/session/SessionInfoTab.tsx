import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { sessionApi } from '../../api/api'
import type { SessionDetail } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { ErrorNote, SectionTitle } from '../../components/ui/primitives'
import { useSessionAction } from '../../hooks/queries'
import { dateTimeText } from '../../lib/format'
import { InviteCard } from './InviteCard'
import { modeText } from '../../lib/queue'

/** The Session tab for players: invite friends, see the rules, or leave. */
export function SessionInfoTab({ session }: { session: SessionDetail }) {
  const navigate = useNavigate()
  const leave = useSessionAction(session.id, () => sessionApi.leave(session.id))
  const rules = session.settings
  const rows = [
    ['Queue', rules.mode === 'SkillBased' ? 'Skill Based' : 'Fair Match'],
    ['Where', session.location],
    ['When', dateTimeText(session.scheduledAt)],
    ['Games', `To ${rules.pointsToWin}, win by ${rules.winBy}`],
    ['Long-wait protection', `after ${rules.waitProtectionMinutes} min`],
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <InviteCard session={session} />
      <section className="card p-5">
        <SectionTitle>Session rules</SectionTitle>
        <dl className="divide-y divide-white/8">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-muted">{modeText[rules.mode]}</p>
        <p className="mt-2 text-sm text-muted">Check in at the courts by scanning the QR or entering the code. When a court frees up, the next four go straight on. Just play and enter the score.</p>
        {session.status !== 'Closed' && session.me?.status !== 'InMatch' && (
          <div className="mt-5 space-y-2">
            <Button variant="danger" block icon={<LogOut className="size-4.5" />} loading={leave.isPending} onClick={() => leave.mutate(undefined, { onSuccess: () => navigate('/') })}>
              Leave session
            </Button>
            <ErrorNote error={leave.error} />
          </div>
        )}
      </section>
    </div>
  )
}
