import clsx from 'clsx'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import logoFull from '../../assets/logo-full.webp'
import logoSmall from '../../assets/logo-small.webp'
import { friendlyMessage } from '../../lib/errors'

/** The ChibiDink logo. `large` loads the high-resolution copy for hero spots (sign-in, invites). */
export function Logo({ className, large }: { className?: string; large?: boolean }) {
  return (
    <img
      src={large ? logoFull : logoSmall}
      alt="ChibiDink"
      draggable={false}
      className={clsx('w-auto select-none', large ? 'h-44' : 'h-14', className)}
    />
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
      <Loader2 className="size-5 animate-spin" />
      <span>{label}…</span>
    </div>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null
  const message = friendlyMessage(error)
  return (
    <p className="flex items-start gap-2 rounded-2xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  )
}

export function PageTitle({ children, sub, action }: { children: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl leading-none font-extrabold italic md:text-4xl">{children}</h1>
        {sub && <p className="mt-1.5 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-xl font-bold">{children}</h2>
      {action}
    </div>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function Field({ label, hint, className, id, ...rest }: FieldProps) {
  const inputId = id ?? rest.name
  return (
    <label className={clsx('block', className)} htmlFor={inputId}>
      <span className="mb-1.5 block text-sm font-semibold text-white/85">{label}</span>
      <input
        id={inputId}
        {...rest}
        className="h-12 w-full rounded-2xl border border-white/10 bg-night px-4 text-base text-white placeholder:text-white/30 focus:border-lime/70 focus:outline-none"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

interface SegmentedProps<T extends string | number> {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  label?: string
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'h-10 rounded-full border px-4 text-sm font-semibold transition',
            o.value === value
              ? 'border-lime bg-lime text-ink shadow-[0_0_16px_-4px_rgb(183_243_59/0.8)]'
              : 'border-white/12 bg-night text-white/80 hover:border-white/30',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative h-7 w-12 shrink-0 rounded-full border transition',
        checked ? 'border-lime bg-lime/90' : 'border-white/15 bg-night',
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 size-5.5 rounded-full shadow transition-all',
          checked ? 'left-[calc(100%-1.5rem)] bg-ink' : 'left-0.5 bg-white/70',
        )}
      />
    </button>
  )
}

export function StatTile({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-night/70 px-3 py-2.5 text-center">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={clsx('font-display text-2xl leading-tight font-extrabold', accent && 'text-lime')}>{value}</div>
    </div>
  )
}
