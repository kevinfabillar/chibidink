import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Share2, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { friendsApi } from '../api/api'
import type { Friend, FriendAction } from '../api/types'
import { PlayerAvatar } from '../components/character/Stage'
import { Button } from '../components/ui/Button'
import { PageError } from '../components/ui/ErrorPage'
import { ErrorNote, Spinner } from '../components/ui/primitives'
import { TopBar } from '../components/ui/TopBar'
import { queryKeys } from '../hooks/queries'
import { PlayerName } from '../components/character/NameTag'

/** Friends: your code to share, add by code, requests both ways, and your friends list. */
export function FriendsPage() {
  const friends = useQuery({ queryKey: queryKeys.friends, queryFn: friendsApi.mine })
  if (!friends.data) return friends.error ? <PageError error={friends.error} onRetry={() => friends.refetch()} /> : <Spinner />
  const { myCode, maxFriends, friends: list, incoming, outgoing } = friends.data

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar back="/profile" title="Friends" sub={`${list.length} of ${maxFriends} friends`} />
      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        <div className="space-y-5">
          <MyCode code={myCode} />
          <AddByCode />
        </div>
        <div className="space-y-5">
          {incoming.length > 0 && (
            <Section title="Friend requests" count={incoming.length}>
              {incoming.map((f) => (
                <Row key={f.player.userId} friend={f} note="Wants to be friends">
                  <Respond userId={f.player.userId} />
                </Row>
              ))}
            </Section>
          )}

          <Section title="Your friends" count={list.length}>
            {list.length === 0 ? (
              <p className="rounded-2xl bg-night/70 p-4 text-center text-sm text-muted">
                No friends yet. Share your code, or add players from their profile.
              </p>
            ) : (
              list.map((f) => (
                <Row key={f.player.userId} friend={f} note={`Lv ${f.player.characterLevel}`}>
                  <RemoveButton userId={f.player.userId} label={`Remove ${f.player.displayName}`} confirm={`Remove ${f.player.displayName} from your friends?`} icon={<UserMinus className="size-4.5" />} />
                </Row>
              ))
            )}
          </Section>

          {outgoing.length > 0 && (
            <Section title="Sent requests" count={outgoing.length}>
              {outgoing.map((f) => (
                <Row key={f.player.userId} friend={f} note="Waiting for them">
                  <RemoveButton userId={f.player.userId} label={`Cancel request to ${f.player.displayName}`} icon={<X className="size-4.5" />} />
                </Row>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function MyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${location.origin}/friends?add=${code}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: the code is on screen to read out */
    }
  }
  const share = () => navigator.share?.({ title: 'Add me on ChibiDink', text: `My ChibiDink friend code: ${code}`, url: link }).catch(() => {})

  return (
    <section className="card p-5 text-center">
      <div className="text-sm font-semibold text-muted">Your friend code</div>
      <div className="my-2 font-display text-4xl font-bold tracking-[0.25em] text-lime">{code}</div>
      <p className="mb-4 text-sm text-muted">Friends type this in to add you.</p>
      <div className="flex gap-2">
        <Button variant="dark" block icon={copied ? <Check className="size-4.5" /> : <Copy className="size-4.5" />} onClick={copy}>
          {copied ? 'Copied' : 'Copy code'}
        </Button>
        {'share' in navigator && (
          <Button variant="grape" block icon={<Share2 className="size-4.5" />} onClick={share}>
            Share
          </Button>
        )}
      </div>
    </section>
  )
}

function AddByCode() {
  const [params] = useSearchParams()
  const [code, setCode] = useState(params.get('add')?.toUpperCase() ?? '')
  const queryClient = useQueryClient()
  const add = useMutation({
    mutationFn: () => friendsApi.addByCode(code),
    onSuccess: () => {
      setCode('')
      void queryClient.invalidateQueries({ queryKey: queryKeys.friends })
    },
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate()
  }

  return (
    <section className="card p-5">
      <h2 className="mb-3 font-display text-lg font-bold">Add a friend</h2>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
            add.reset()
          }}
          placeholder="Friend code"
          aria-label="Friend code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-ink px-4 font-display text-lg tracking-[0.2em] text-white uppercase placeholder:tracking-normal placeholder:text-white/40 focus:border-lime/70 focus:outline-none"
        />
        <Button type="submit" icon={<UserPlus className="size-5" />} disabled={code.length !== 6} loading={add.isPending}>
          Add
        </Button>
      </form>
      {add.data && <p className="mt-3 text-sm font-semibold text-lime">{resultText(add.data)}</p>}
      <div className="mt-3">
        <ErrorNote error={add.error} />
      </div>
    </section>
  )
}

const resultText = ({ player, status }: FriendAction) =>
  status === 'Friends' ? `You and ${player.displayName} are now friends!` : `Request sent to ${player.displayName}.`

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <Users className="size-5 text-lime" />
        {title}
        <span className="ml-auto rounded-full bg-white/8 px-2 text-sm text-muted">{count}</span>
      </h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  )
}

function Row({ friend, note, children }: { friend: Friend; note: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-night/70 p-2.5">
      <Link to={`/players/${friend.player.userId}`} className="flex min-w-0 flex-1 items-center gap-3">
        <PlayerAvatar player={friend.player} size={44} />
        <div className="min-w-0">
          <div className="flex min-w-0 font-semibold">
            <PlayerName player={friend.player} truncate />
          </div>
          <div className="text-xs text-muted">{note}</div>
        </div>
      </Link>
      <div className="flex shrink-0 gap-1.5">{children}</div>
    </li>
  )
}

function useFriendAction<T>(fn: (v: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.friends })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me })
      void queryClient.invalidateQueries({ queryKey: ['player'] })
    },
  })
}

function Respond({ userId }: { userId: string }) {
  const accept = useFriendAction(() => friendsApi.accept(userId))
  const decline = useFriendAction(() => friendsApi.remove(userId))
  return (
    <>
      <Button size="sm" icon={<Check className="size-4" />} loading={accept.isPending} disabled={decline.isPending} onClick={() => accept.mutate(undefined)}>
        Accept
      </Button>
      <Button size="sm" variant="dark" aria-label="Decline" loading={decline.isPending} disabled={accept.isPending} onClick={() => decline.mutate(undefined)}>
        <X className="size-4" />
      </Button>
      {(accept.error || decline.error) && <span className="sr-only">Something went wrong</span>}
    </>
  )
}

function RemoveButton({ userId, label, confirm, icon }: { userId: string; label: string; confirm?: string; icon: ReactNode }) {
  const remove = useFriendAction(() => friendsApi.remove(userId))
  return (
    <Button
      size="sm"
      variant="dark"
      aria-label={label}
      title={label}
      loading={remove.isPending}
      onClick={() => (!confirm || window.confirm(confirm)) && remove.mutate(undefined)}
    >
      {icon}
    </Button>
  )
}
