import type { LucideIcon } from 'lucide-react'
import { PageTitle } from '../components/ui/primitives'

export function ComingSoonPage({ title, phase, blurb, icon: Icon }: { title: string; phase: string; blurb: string; icon: LucideIcon }) {
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle>{title}</PageTitle>
      <div className="card shadow-glow-grape flex flex-col items-center p-10 text-center">
        <div className="grid size-20 place-items-center rounded-3xl bg-grape/20 text-grape">
          <Icon className="size-10" />
        </div>
        <span className="mt-5 pill border-lime/60 text-lime">Coming in {phase}</span>
        <p className="mt-3 text-white/75">{blurb}</p>
      </div>
    </div>
  )
}
