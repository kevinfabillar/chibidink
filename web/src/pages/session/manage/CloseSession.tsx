import { useState } from 'react'
import { sessionApi } from '../../../api/api'
import type { SessionDetail } from '../../../api/types'
import { Button } from '../../../components/ui/Button'
import { ErrorNote, SectionTitle } from '../../../components/ui/primitives'
import { Sheet } from '../../../components/ui/Sheet'
import { useSessionAction } from '../../../hooks/queries'

export function CloseSession({ session }: { session: SessionDetail }) {
  const [open, setOpen] = useState(false)
  const unfinished = session.courts.filter((c) => c.match && ['Playing', 'PendingResult'].includes(c.match.status)).length
  const close = useSessionAction(session.id, (voidUnfinished: boolean) => sessionApi.close(session.id, voidUnfinished))

  return (
    <section className="card p-5">
      <SectionTitle>End session</SectionTitle>
      <p className="mb-3 text-sm text-muted">Stops the queue. Verified results are already saved to each player's record.</p>
      <Button variant="danger" block onClick={() => setOpen(true)}>
        Close session
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Close this session?">
        <div className="space-y-3">
          {unfinished > 0 ? (
            <p className="text-white/80">
              {unfinished} match(es) are still playing or waiting for a score. Verify them first, or void them now (no result will
              be recorded).
            </p>
          ) : (
            <p className="text-white/80">Matches that haven't started will be cancelled.</p>
          )}
          <ErrorNote error={close.error} />
          {unfinished > 0 && (
            <Button variant="danger" block loading={close.isPending} onClick={() => close.mutate(true)}>
              Void {unfinished} and close
            </Button>
          )}
          {unfinished === 0 && (
            <Button variant="danger" block loading={close.isPending} onClick={() => close.mutate(false, { onSuccess: () => setOpen(false) })}>
              Close session
            </Button>
          )}
          <Button variant="ghost" block onClick={() => setOpen(false)}>
            Keep playing
          </Button>
        </div>
      </Sheet>
    </section>
  )
}
