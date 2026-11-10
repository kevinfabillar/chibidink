import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { KudosPrompt } from '../../api/types'
import { KUDOS } from '../../lib/kudos'

/** Home: right after a game, a nudge to give the other players kudos (like Reclub's post-game prompt). */
export function KudosBanner({ prompt }: { prompt: KudosPrompt }) {
  return (
    <Link
      to={`/sessions/${prompt.sessionId}?tab=games#kudos`}
      className="mt-3 flex items-center gap-3 rounded-2xl border border-lime/50 bg-gradient-to-r from-lime/15 via-surface/70 to-surface/70 p-3 transition hover:border-lime"
    >
      {/* A little fan of kudos icons. */}
      <span className="flex shrink-0 -space-x-2">
        {KUDOS.slice(0, 3).map(({ kind, icon: Icon, color }) => (
          <span key={kind} className="grid size-9 place-items-center rounded-full border-2 border-surface" style={{ background: color }}>
            <Icon className="size-4.5 text-[#0b0f17]" />
          </span>
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg leading-tight font-extrabold">How was your game?</span>
        <span className="block truncate text-xs text-white/80">Give kudos to your Court {prompt.courtNumber} players · {prompt.sessionTitle}</span>
      </span>
      <ChevronRight className="size-7 shrink-0 text-lime" />
    </Link>
  )
}
