import { QRCodeSVG } from 'qrcode.react'
import type { SessionDetail } from '../../api/types'
import { SectionTitle } from '../../components/ui/primitives'

/**
 * The address phones should open. On "localhost" (developing on this PC) a phone can't reach that,
 * so use this PC's address on the local network instead.
 */
function shareableOrigin() {
  const { protocol, hostname, port, origin } = window.location
  const lan = import.meta.env.VITE_LAN_HOST as string | undefined
  const local = hostname === 'localhost' || hostname === '127.0.0.1'
  return local && lan ? `${protocol}//${lan}${port ? `:${port}` : ''}` : origin
}

/** Check-in point: players scan the QR or type the session code. */
export function InviteCard({ session }: { session: SessionDetail }) {
  // The QR opens the check-in page for this code.
  const url = `${shareableOrigin()}/join/${session.inviteCode}`

  return (
    <section className="card p-5">
      <SectionTitle>Check-in</SectionTitle>
      <p className="-mt-1 mb-3 text-sm text-muted">Show this at the courts. Players scan the QR or type the code to check in and join the line.</p>
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="rounded-2xl bg-white p-3">
          <QRCodeSVG value={url} size={148} level="M" />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="text-sm text-muted">Session code</div>
          <div className="font-display text-5xl font-extrabold tracking-[0.18em] text-lime">{session.inviteCode}</div>
        </div>
      </div>
    </section>
  )
}
