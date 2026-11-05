import { Check } from 'lucide-react'
import { Link } from 'react-router'

/** Required "I agree" box for sign-up and guest play. The links open in a new tab so the form keeps what you typed. */
export function TermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-white/85">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" required />
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 border-white/40 transition peer-checked:border-lime peer-checked:bg-lime peer-focus-visible:ring-2 peer-focus-visible:ring-lime/60">
        {checked && <Check className="size-3.5 text-ink" strokeWidth={3} />}
      </span>
      <span>
        I agree to the{' '}
        <Link to="/terms" target="_blank" className="font-semibold text-lime hover:underline">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link to="/privacy" target="_blank" className="font-semibold text-lime hover:underline">
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  )
}
