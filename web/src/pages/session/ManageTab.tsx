import { Pause, Play, Sparkles } from 'lucide-react'
import { sessionApi } from '../../api/api'
import type { SessionDetail } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { ErrorNote, SectionTitle, Toggle } from '../../components/ui/primitives'
import { useSessionAction } from '../../hooks/queries'
import { InviteCard } from './InviteCard'
import { SessionRules } from './SessionInfoTab'
import { AuditLog } from './manage/AuditLog'
import { CloseSession } from './manage/CloseSession'
import { ManualMatchBuilder } from './manage/ManualMatchBuilder'
import { PartnersAdmin } from './manage/PartnersAdmin'
import { PlayersAdmin } from './manage/PlayersAdmin'
import { SettingsForm } from './manage/SettingsForm'

export function ManageTab({ session }: { session: SessionDetail }) {
  if (session.status === 'Closed')
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <p className="card p-5 text-muted">This session is closed. Results are saved to every player's record.</p>
          <SessionRules session={session} />
        </div>
        <AuditLog sessionId={session.id} />
      </div>
    )

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <InviteCard session={session} />
        <SessionRules session={session} />
        <MatchmakingControls session={session} />
        <CourtAvailability session={session} />
        <ManualMatchBuilder session={session} />
      </div>
      <div className="space-y-5">
        <PlayersAdmin session={session} />
        {session.format === 'Doubles' && <PartnersAdmin session={session} />}
        <SettingsForm session={session} />
        <AuditLog sessionId={session.id} />
        <CloseSession session={session} />
      </div>
    </div>
  )
}

function MatchmakingControls({ session }: { session: SessionDetail }) {
  const active = session.status === 'Active'
  const start = useSessionAction(session.id, () => sessionApi.start(session.id))
  const pause = useSessionAction(session.id, () => sessionApi.pause(session.id))
  const fill = useSessionAction(session.id, () => sessionApi.fill(session.id))
  const auto = useSessionAction(session.id, (on: boolean) =>
    sessionApi.update(session.id, {
      title: session.title,
      location: session.location,
      scheduledAt: session.scheduledAt,
      settings: { ...session.settings, autoMatchmaking: on },
    }),
  )

  return (
    <section className="card space-y-4 p-5">
      <SectionTitle>Matchmaking</SectionTitle>
      <div className="flex flex-wrap gap-2.5">
        {active ? (
          <Button variant="dark" icon={<Pause className="size-5" />} loading={pause.isPending} onClick={() => pause.mutate()}>
            Pause
          </Button>
        ) : (
          <Button icon={<Play className="size-5" />} loading={start.isPending} onClick={() => start.mutate()}>
            Start session
          </Button>
        )}
        <Button variant="grape" icon={<Sparkles className="size-5" />} loading={fill.isPending} onClick={() => fill.mutate()}>
          Fill open courts now
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-night/70 p-3">
        <div>
          <div className="font-semibold">Automatic matchmaking</div>
          <div className="text-sm text-muted">Fill free courts as soon as players are waiting.</div>
        </div>
        <Toggle label="Automatic matchmaking" checked={session.settings.autoMatchmaking} onChange={(v) => auto.mutate(v)} />
      </div>
      {fill.data && <p className="text-sm text-lime">{fill.data.created} match(es) created.</p>}
      <ErrorNote error={start.error ?? pause.error ?? fill.error ?? auto.error} />
    </section>
  )
}

function CourtAvailability({ session }: { session: SessionDetail }) {
  const setAvailable = useSessionAction(session.id, ({ court, available }: { court: number; available: boolean }) =>
    sessionApi.setCourtAvailable(session.id, court, available),
  )
  return (
    <section className="card p-5">
      <SectionTitle>Courts</SectionTitle>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {session.courts.map((c) => (
          <li key={c.number} className="flex items-center justify-between rounded-2xl bg-night/70 p-3">
            <span className="font-display text-lg font-bold">Court {c.number}</span>
            <Toggle
              label={`Court ${c.number} available`}
              checked={c.status === 'Available'}
              onChange={(available) => setAvailable.mutate({ court: c.number, available })}
            />
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <ErrorNote error={setAvailable.error} />
      </div>
    </section>
  )
}
