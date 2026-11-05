import clsx from 'clsx'
import type { ReactNode } from 'react'

/** "Nothing here yet" in one consistent style: an icon, a short title, a hint and an optional action. */
export function EmptyState({ icon, title, text, action, compact }: { icon?: ReactNode; title: string; text?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={clsx('flex flex-col items-center text-center', compact ? 'py-4' : 'card px-5 py-8')}>
      {icon && <div className="mb-2 grid size-12 place-items-center rounded-2xl bg-white/6 text-white/60">{icon}</div>}
      <div className="font-display text-lg font-bold">{title}</div>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
