import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Handshake, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { friendsApi } from '../../api/api'
import { queryKeys, useMe } from '../../hooks/queries'
import { FRIENDS_ENABLED } from '../../lib/features'
import { PlayerAvatar } from '../character/Stage'

/** Top bar button (phones and tablets): opens Friends, red badge for requests waiting on you. */
export function FriendsButton() {
  const requests = useMe().data?.friendRequests ?? 0
  return (
    <Link
      to="/friends"
      className="relative grid size-9 place-items-center rounded-full text-white/90 hover:bg-white/10 lg:hidden"
      aria-label={requests ? `Friends, ${requests} request${requests === 1 ? '' : 's'}` : 'Friends'}
      title="Friends"
    >
      <Handshake className="size-6" />
      {requests > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full bg-danger px-1 text-[11px] leading-4.5 font-bold text-snow">
          {requests}
        </span>
      )}
    </Link>
  )
}

const SHOWN = 5

/** Home card (phones and tablets): your friends' faces, a + to add one, and requests waiting. */
export function FriendsStrip() {
  const requests = useMe().data?.friendRequests ?? 0
  const friends = useQuery({ queryKey: queryKeys.friends, queryFn: friendsApi.mine, enabled: FRIENDS_ENABLED })
  const list = friends.data?.friends ?? []

  return (
    <Link to="/friends" className="card mt-3 block p-3.5 transition hover:border-lime/50 lg:hidden">
      <div className="flex items-center gap-2">
        <Handshake className="size-5 text-lime" />
        <span className="font-display text-lg font-extrabold">Friends</span>
        {!FRIENDS_ENABLED && <span className="rounded-full border border-lime/60 px-2 py-px text-[11px] font-semibold text-lime">Coming soon</span>}
        <span className="ml-auto flex items-center text-sm font-semibold text-lime">
          {FRIENDS_ENABLED ? 'See all' : 'Preview'}
          <ChevronRight className="size-5" />
        </span>
      </div>

      {FRIENDS_ENABLED ? (
        <>
          <div className="mt-2.5 flex items-center gap-2">
            {list.slice(0, SHOWN).map((f) => (
              <span key={f.player.userId} className="grid size-11 place-items-center overflow-hidden rounded-full border border-white/12 bg-night/70">
                <PlayerAvatar player={f.player} size={44} />
              </span>
            ))}
            {list.length > SHOWN && <span className="text-sm font-semibold text-muted">+{list.length - SHOWN}</span>}
            <span className="grid size-11 place-items-center rounded-full border-2 border-dashed border-lime/60 text-lime" aria-label="Add a friend">
              <Plus className="size-5" />
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            {requests > 0 ? (
              <span className="font-semibold text-danger">
                {requests} friend request{requests === 1 ? '' : 's'} waiting
              </span>
            ) : list.length === 0 ? (
              'Add friends with their friend code.'
            ) : (
              `${list.length} friend${list.length === 1 ? '' : 's'}`
            )}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-xs text-muted">Add friends with a code and see their characters. We're still building this.</p>
      )}
    </Link>
  )
}
