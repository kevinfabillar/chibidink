import { useState } from 'react'
import { sessionApi } from '../../../api/api'
import type { SessionDetail, SessionSettings } from '../../../api/types'
import { Button } from '../../../components/ui/Button'
import { ErrorNote, SectionTitle, Segmented, Toggle } from '../../../components/ui/primitives'
import { useSessionAction } from '../../../hooks/queries'
import { modeText } from '../../../lib/queue'

export function SettingsForm({ session }: { session: SessionDetail }) {
  const [s, setS] = useState<SessionSettings>(session.settings)
  const set = <K extends keyof SessionSettings>(key: K, value: SessionSettings[K]) => setS((prev) => ({ ...prev, [key]: value }))
  const save = useSessionAction(session.id, () =>
    sessionApi.update(session.id, { title: session.title, location: session.location, scheduledAt: session.scheduledAt, settings: s }),
  )

  return (
    <section className="card space-y-4 p-5">
      <SectionTitle>Rules</SectionTitle>
      <Row label="Queue">
        <Segmented
          label="Queue mode"
          value={s.mode}
          onChange={(v) => set('mode', v)}
          options={[
            { value: 'FairMatch' as const, label: 'Fair Match' },
            { value: 'SkillBased' as const, label: 'Skill Based' },
          ]}
        />
        <p className="mt-1.5 text-xs text-muted">{modeText[s.mode]}</p>
      </Row>
      <Row label="Game to">
        <Segmented label="Points to win" value={s.pointsToWin} onChange={(v) => set('pointsToWin', v)} options={[11, 15, 21].map((n) => ({ value: n, label: n }))} />
      </Row>
      <Row label="Deuce">
        <Segmented
          label="Deuce"
          value={s.winBy}
          onChange={(v) => set('winBy', v)}
          options={[
            { value: 1, label: 'No deuce (11–10 wins)' },
            { value: 2, label: 'Deuce (win by 2)' },
          ]}
        />
      </Row>
      <Row label="Long-wait protection">
        <Segmented
          label="Wait protection"
          value={s.waitProtectionMinutes}
          onChange={(v) => set('waitProtectionMinutes', v)}
          options={[10, 20, 30, 45].map((n) => ({ value: n, label: `${n} min` }))}
        />
      </Row>
      <div className="flex items-center justify-between rounded-2xl bg-night/70 p-3">
        <span className="font-semibold">New players can join with the code</span>
        <Toggle label="Open admission" checked={s.openAdmission} onChange={(v) => set('openAdmission', v)} />
      </div>
      <ErrorNote error={save.error} />
      <Button block loading={save.isPending} onClick={() => save.mutate()}>
        {save.isSuccess ? 'Saved' : 'Save rules'}
      </Button>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-white/85">{label}</div>
      {children}
    </div>
  )
}
