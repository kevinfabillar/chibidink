import { Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LEGAL_TEXT, PrivacyContent, TermsContent } from '../../pages/LegalPages'
import { LEGAL_UPDATED } from '../../lib/legal'
import { Button } from './Button'

type Doc = 'terms' | 'privacy'

/**
 * Required "I agree" box for sign-up and guest play. The documents open in a pop-up over the form
 * (not a new tab: in-app browsers like Messenger's would leave the page and the form would come back empty).
 */
export function TermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const [doc, setDoc] = useState<Doc | null>(null)
  const link = (d: Doc, text: string) => (
    <button type="button" onClick={() => setDoc(d)} className="font-semibold text-lime hover:underline">
      {text}
    </button>
  )

  return (
    <>
      <div className="flex items-start gap-3 text-sm text-white/85">
        <label className="flex cursor-pointer items-start">
          <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" required />
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 border-white/40 transition peer-checked:border-lime peer-checked:bg-lime peer-focus-visible:ring-2 peer-focus-visible:ring-lime/60">
            {checked && <Check className="size-3.5 text-ink" strokeWidth={3} />}
          </span>
          <span className="sr-only">I agree to the Terms of Service and Privacy Policy</span>
        </label>
        <span>
          <span className="cursor-pointer" onClick={() => onChange(!checked)}>
            I agree to the{' '}
          </span>
          {link('terms', 'Terms of Service')} and {link('privacy', 'Privacy Policy')}.
        </span>
      </div>

      {doc && (
        <LegalModal
          title={doc === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
          onClose={() => setDoc(null)}
          onAgree={() => {
            onChange(true)
            setDoc(null)
          }}
        >
          {doc === 'privacy' ? <PrivacyContent /> : <TermsContent onPrivacy={() => setDoc('privacy')} />}
        </LegalModal>
      )}
    </>
  )
}

/**
 * A centred pop-up with the document; closes with ✕, the backdrop or Escape. Rendered at the top of the page
 * (a portal), so cards with blur effects around the form can't trap it.
 */
function LegalModal({ title, onClose, onAgree, children }: { title: string; onClose: () => void; onAgree: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden' // the page behind doesn't scroll
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = scroll
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal aria-label={title}>
      <button type="button" className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 pt-4 pb-3">
          <div>
            <h2 className="font-display text-2xl font-bold">{title}</h2>
            <p className="text-xs text-muted">Last updated {LEGAL_UPDATED}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/70 hover:bg-white/10" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className={`overflow-y-auto overscroll-contain px-5 py-4 ${LEGAL_TEXT}`}>{children}</div>
        <div className="border-t border-white/8 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button block size="lg" onClick={onAgree}>
            I agree
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
