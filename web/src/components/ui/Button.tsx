import clsx from 'clsx'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'lime' | 'grape' | 'dark' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  block?: boolean
  /** Fully rounded ends (Accept / Decline style). */
  pill?: boolean
}

const variants: Record<Variant, string> = {
  lime: 'bg-gradient-to-b from-[#CCFF5C] to-lime text-ink shadow-[0_6px_24px_-8px_rgb(183_243_59/0.8),inset_0_-2px_0_rgb(0_0_0/0.12)] hover:brightness-105',
  grape: 'bg-gradient-to-b from-[#B56BFF] to-grape-deep text-white shadow-[0_6px_24px_-8px_rgb(163_72_250/0.8),inset_0_-2px_0_rgb(0_0_0/0.15)] hover:brightness-110',
  dark: 'bg-surface-2 text-white border border-white/12 hover:bg-white/10',
  ghost: 'bg-transparent text-white/80 hover:bg-white/8 hover:text-white',
  danger: 'bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-14 px-6 text-xl',
}

export function Button({ variant = 'lime', size = 'md', loading, icon, block, pill, className, children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-display font-bold transition active:scale-[0.97] disabled:opacity-50',
        variants[variant],
        sizes[size],
        pill ? 'rounded-full' : size === 'sm' ? 'rounded-xl' : 'rounded-2xl',
        block && 'w-full',
        className,
      )}
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  )
}
