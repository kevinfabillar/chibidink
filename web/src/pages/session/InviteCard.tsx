import { Check, Copy, Download, Share2 } from 'lucide-react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { useRef, useState } from 'react'
import type { SessionDetail } from '../../api/types'
import { Button } from '../../components/ui/Button'
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

/** Check-in point: players scan the QR or type the session code. The QR can be saved or shared as a poster. */
export function InviteCard({ session }: { session: SessionDetail }) {
  // The QR opens the check-in page for this code.
  const url = `${shareableOrigin()}/join/${session.inviteCode}`
  const qr = useRef<HTMLCanvasElement>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const canShareFiles = typeof navigator !== 'undefined' && 'canShare' in navigator

  const fileName = `chibidink-${session.inviteCode}.png`
  const text = `Join "${session.title}" on ChibiDink: scan the QR or enter the code ${session.inviteCode}.`

  const download = async () => {
    const blob = await posterBlob(qr.current, session)
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const share = async () => {
    setBusy(true)
    try {
      const blob = await posterBlob(qr.current, session)
      if (!blob) return
      const file = new File([blob], fileName, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: session.title, text })
      else await download() // this browser can't share images: save it instead
    } catch {
      // closed the share menu: nothing to do
    } finally {
      setBusy(false)
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked: the code is on screen anyway
    }
  }

  return (
    <section className="card p-5">
      <SectionTitle>Check-in</SectionTitle>
      <p className="-mt-1 mb-3 text-sm text-muted">Show this at the courts, or save and send it. Players scan the QR or type the code to check in and join the line.</p>
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="rounded-2xl bg-snow p-3 light:shadow-[0_6px_20px_-10px_rgb(90_50_160/0.4)]">
          <QRCodeSVG value={url} size={148} level="M" />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="text-sm text-muted">Session code</div>
          <div className="font-display text-4xl font-extrabold tracking-[0.14em] break-all text-lime min-[420px]:text-5xl light:rounded-full light:bg-[linear-gradient(90deg,#B7F33B,#DDFF8F)] light:px-6 light:py-1 light:!text-[#1b1035]">{session.inviteCode}</div>
          <button onClick={copyCode} className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-white/75 hover:bg-white/8 hover:text-white">
            {copied ? <Check className="size-4 text-lime" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="dark" icon={<Download className="size-5" />} onClick={download} className="px-3 text-[15px] whitespace-nowrap">
          Download QR
        </Button>
        <Button icon={<Share2 className="size-5" />} loading={busy} onClick={share} className="px-3 text-[15px] whitespace-nowrap">
          {canShareFiles ? 'Share QR' : 'Save QR'}
        </Button>
      </div>
      {/* Hidden high-resolution QR used to draw the poster. */}
      <QRCodeCanvas ref={qr} value={url} size={720} level="M" marginSize={0} className="hidden" aria-hidden />
    </section>
  )
}

/** A 1080×1350 check-in poster (session name, big QR, code) as a PNG, ready to print or send. */
async function posterBlob(qr: HTMLCanvasElement | null, session: SessionDetail): Promise<Blob | null> {
  if (!qr) return null
  await document.fonts?.ready
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) return null

  // Brand background.
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0E1424')
  bg.addColorStop(1, '#070C14')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'center'

  ctx.fillStyle = '#B7F33B'
  ctx.font = '800 72px "Baloo 2", system-ui, sans-serif'
  ctx.fillText('ChibiDink', W / 2, 130)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '700 52px "Baloo 2", system-ui, sans-serif'
  ctx.fillText(fit(ctx, session.title, W - 140), W / 2, 215)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '500 34px Inter, system-ui, sans-serif'
  ctx.fillText(fit(ctx, session.location, W - 160), W / 2, 270)

  // White panel with the QR.
  const panel = 800
  const px = (W - panel) / 2
  const py = 330
  roundRect(ctx, px, py, panel, panel, 48)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(qr, px + 40, py + 40, panel - 80, panel - 80)

  // The code, for typing in.
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '600 34px Inter, system-ui, sans-serif'
  ctx.fillText('Scan with your camera, or enter the code', W / 2, 1210)
  ctx.fillStyle = '#B7F33B'
  ctx.font = '800 96px "Baloo 2", system-ui, sans-serif'
  ctx.fillText(session.inviteCode.split('').join(' '), W / 2, 1305)

  return new Promise((resolve) => c.toBlob(resolve, 'image/png'))
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
