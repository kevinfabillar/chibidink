import clsx from 'clsx'
import { Trophy } from 'lucide-react'
import type { Match, MatchPlayer, Team } from '../../api/types'
import { teamNames } from '../../lib/format'
import { Button } from '../ui/Button'
import { Sheet } from '../ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  match: Match
  /** Sends the winner. The sheet closes straight away; saving finishes in the background. */
  onWinner: (team: Team) => void
}

/** Organizer taps Won on the team that won: no score. It ends the game and the next four go on this court. */
export function ReportWinnerSheet({ open, onClose, match, onWinner }: Props) {
  const pick = (team: Team) => {
    onWinner(team)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={`Court ${match.courtNumber}: who won?`}>
      <p className="mb-4 text-sm text-muted">Tap Won on the winning team. The game ends and the next four go on this court.</p>
      <div className="space-y-3">
        <TeamChoice label="Team A" players={match.teamA} accent="lime" onWon={() => pick('A')} />
        <TeamChoice label="Team B" players={match.teamB} accent="grape" onWon={() => pick('B')} />
      </div>
    </Sheet>
  )
}

function TeamChoice({ label, players, accent, onWon }: { label: string; players: MatchPlayer[]; accent: 'lime' | 'grape'; onWon: () => void }) {
  return (
    <div className={clsx('flex items-center gap-3 rounded-2xl border bg-night/70 p-3', accent === 'lime' ? 'border-lime/30' : 'border-grape/40')}>
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg font-bold">{label}</div>
        <div className="text-sm text-muted [overflow-wrap:anywhere] leading-tight">{teamNames(players.map((p) => p.player.displayName))}</div>
      </div>
      <Button variant={accent} icon={<Trophy className="size-5" />} onClick={onWon} pill className="shrink-0">
        Won
      </Button>
    </div>
  )
}
