import clsx from 'clsx'
import { Clock, Crown, Link2, LogIn, QrCode } from 'lucide-react'
import { sessionApi } from '../../api/api'
import type { Participant, SessionDetail } from '../../api/types'
import { PlayerAvatar } from '../../components/character/Stage'
import { UpNextCard } from '../../components/session/UpNext'
import { UpNextActions } from '../../components/session/UpNextActions'
import { Button } from '../../components/ui/Button'
import { ErrorNote, SectionTitle } from '../../components/ui/primitives'
import { useCosmetics, useSessionAction } from '../../hooks/queries'
import { minutesAgo, useNow } from '../../lib/format'
import { modeText, partnerNames } from '../../lib/queue'
import { sessionEarnings } from '../../lib/rewards'
import { tierName } from '../../lib/skill'
import { PlayerName } from '../../components/character/NameTag'


export function QueueTab({ session }: { session: SessionDetail }) {
  const now = useNow(15_000)
  const me = session.me
  const checkIn = useSessionAction(session.id, () => sessionApi.setQueued(session.id, me!.player.userId, true))

  const waiting = session.participants.filter((p) => p.status === 'Waiting')
  const playing = session.participants.filter((p) => p.status === 'InMatch')
  const checkedOut = session.participants.filter((p) => p.status === 'Paused')
  const grouped = new Set(session.upNext.flatMap((g) => [...g.teamA, ...g.teamB].map((p) => p.userId)))
  const stillWaiting = waiting.filter((p) => !grouped.has(p.player.userId))
  const closed = session.status === 'Closed'
  const skillBased = session.settings.mode === 'SkillBased'
  const partners = partnerNames(session)
  const earned = sessionEarnings(me, useCosmetics().data?.rewards)
  const myGroup = me && session.upNext.find((g) => [...g.teamA, ...g.teamB].some((p) => p.userId === me.player.userId))

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      {me && (
        <section className="card h-fit p-5 text-center">
          <PlayerAvatar player={me.player} variant="full" size={130} className="mx-auto" />
          <h2 className="mt-1 font-display text-2xl font-bold">
            <PlayerName player={me.player} size="md" />
          </h2>
          <p className="text-sm text-muted">
            {skillBased && `${tierName(me.skillEstimate)} · `}This session: {me.completedGames} games · {me.wins}W {me.losses}L
          </p>
          {earned && (
            <p className="mt-1 text-sm font-semibold">
              <span className="text-lime">+{earned.xp} XP</span> · +{earned.coins} coins this session
            </p>
          )}
          <div className="my-4 font-display text-xl font-bold">
            {me.status === 'Waiting' && (
              <span className="text-lime">
                {myGroup ? (myGroup.order === 1 ? 'You’re next on court!' : `In group ${myGroup.order}`) : `In line · #${me.queuePosition}`}{' '}
                <span className="text-sm text-muted">({minutesAgo(me.waitingSince, now)})</span>
              </span>
            )}
            {me.status === 'InMatch' && <span className="text-lime">On court</span>}
            {me.status === 'Paused' && <span className="text-white/70">Checked out</span>}
          </div>
          {!closed && me.status === 'Paused' && (
            <Button block size="lg" icon={<LogIn className="size-5" />} loading={checkIn.isPending} onClick={() => checkIn.mutate()}>
              Check in
            </Button>
          )}
          <div className="mt-3">
            <ErrorNote error={checkIn.error} />
          </div>
          <p className="mt-3 text-xs text-muted">{modeText[session.settings.mode]}</p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted">
            <QrCode className="size-3.5" /> Players check in by scanning the session QR or entering the code.
          </p>
        </section>
      )}

      <div className="space-y-6">
        {session.upNext.length > 0 ? (
          <section>
            <SectionTitle>Next in queue</SectionTitle>
            <p className="-mt-1 mb-2 text-sm text-muted">
              These groups go on court in this order as courts free up.
              {session.isOrganizer && ' Edit a group to choose its players. When a court frees up, the next group is put on it, ready to start.'}
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {session.upNext.map((g) => (
                <UpNextCard
                  key={g.order}
                  group={g}
                  highlight={g.order === 1}
                  actions={session.isOrganizer && !closed ? <UpNextActions session={session} group={g} /> : undefined}
                />
              ))}
            </div>
          </section>
        ) : (
          !closed &&
          waiting.length > 0 && (
            <section>
              <SectionTitle>Next in queue</SectionTitle>
              <p className="card p-4 text-center text-sm text-muted">
                {waiting.length < 4
                  ? `${4 - waiting.length} more player${4 - waiting.length === 1 ? '' : 's'} needed to make the next group of four.`
                  : 'Everyone waiting is still finishing a game somewhere else.'}
              </p>
            </section>
          )
        )}
        <PlayerGroup title={`Waitlist (${stillWaiting.length})`} players={stillWaiting} now={now} showPosition skillBased={skillBased} partners={partners} />
        <PlayerGroup title={`Checked out (${checkedOut.length})`} players={checkedOut} now={now} dim skillBased={skillBased} partners={partners} />
        {waiting.length === 0 && playing.length === 0 && (
          <p className="card p-5 text-center text-sm text-muted">Nobody is checked in yet. Share the code or QR from the Session tab.</p>
        )}
      </div>
    </div>
  )
}

/** How long a player has been waiting, as a small badge. Turns amber after 15 minutes. */
function WaitTime({ since, now }: { since: string | null; now: number }) {
  const minutes = since ? Math.max(0, Math.floor((now - new Date(since).getTime()) / 60000)) : 0
  return (
    <span
      className={clsx(
        'flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        minutes >= 15 ? 'border-amber-300/50 text-amber-200' : 'border-white/15 text-white/75',
      )}
      title="Time waiting"
    >
      <Clock className="size-3.5" />
      {minutes < 1 ? 'Just joined' : `${minutes} min`}
    </span>
  )
}

export function PlayerGroup({
  title,
  players,
  now,
  showPosition,
  dim,
  skillBased,
  partners,
}: {
  title: string
  players: Participant[]
  now: number
  showPosition?: boolean
  dim?: boolean
  skillBased?: boolean
  /** userId -> fixed partner's name. */
  partners?: Map<string, string>
}) {
  if (players.length === 0) return null
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <ul className="grid gap-2 sm:grid-cols-2">
        {players.map((p) => (
          <li key={p.player.userId} className={clsx('card flex items-center gap-3 p-2.5 pr-4', dim && 'opacity-60')}>
            {showPosition && <span className="w-7 text-center font-display text-xl font-extrabold text-lime">{p.queuePosition}</span>}
            <PlayerAvatar player={p.player} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-semibold [overflow-wrap:anywhere] leading-tight">
                <PlayerName player={p.player} />
                {p.role === 'Organizer' && <Crown className="size-3.5 text-lime" aria-label="Organizer" />}
                {partners?.has(p.player.userId) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-lime/40 px-1.5 py-px text-[11px] font-semibold text-lime">
                    <Link2 className="size-3" />
                    with {partners.get(p.player.userId)}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted">
                {skillBased && `${tierName(p.skillEstimate)} · `}
                {p.completedGames} games · {p.wins}W {p.losses}L
              </div>
            </div>
            {showPosition && <WaitTime since={p.waitingSince} now={now} />}
          </li>
        ))}
      </ul>
    </section>
  )
}
