import { motion } from 'motion/react'
import type { Match, SessionDetail } from '../../api/types'
import { MatchActions } from '../../components/court/MatchActions'
import { matchStatusLabel, teamNames } from '../../lib/format'

/** Pinned card telling the signed-in player where to go and what to do next. */
export function MyMatchBanner({ session, match }: { session: SessionDetail; match: Match }) {
  const myTeam = match.myTeam === 'A' ? match.teamA : match.teamB
  const theirs = match.myTeam === 'A' ? match.teamB : match.teamA
  const me = session.me?.player.userId
  const partners = myTeam.filter((p) => p.player.userId !== me).map((p) => p.player.displayName)

  const headline =
    match.status === 'AwaitingConfirmation'
      ? `You're up on Court ${match.courtNumber}!`
      : match.status === 'Ready'
        ? `Head to Court ${match.courtNumber}`
        : match.status === 'Playing'
          ? `Playing on Court ${match.courtNumber}`
          : `Court ${match.courtNumber}: ${matchStatusLabel[match.status]}`

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card shadow-glow-lime mb-5 bg-gradient-to-r from-lime/12 via-surface/80 to-grape/15 p-4"
      aria-live="polite"
    >
      <h2 className="font-display text-2xl font-extrabold italic">{headline}</h2>
      <p className="mb-3 text-sm text-white/75">
        {partners.length > 0 && <>With {teamNames(partners)} · </>}
        vs {teamNames(theirs.map((p) => p.player.displayName))}
      </p>
      <MatchActions session={session} match={match} />
    </motion.section>
  )
}
