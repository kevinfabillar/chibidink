import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check, ChevronLeft, ChevronRight, Copy, QrCode, Share2, UserPlus, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { friendsApi } from '../api/api'
import type { Friend, FriendAction } from '../api/types'
import { PlayerName } from '../components/character/NameTag'
import { PlayerAvatar } from '../components/character/Stage'
import { Button } from '../components/ui/Button'
import { PageError } from '../components/ui/ErrorPage'
import { ErrorNote, Spinner } from '../components/ui/primitives'
import { Sheet } from '../components/ui/Sheet'
import { TopBar } from '../components/ui/TopBar'
import { queryKeys } from '../hooks/queries'

const CODE_LENGTH = 6
const PER_PAGE = 10
const cleanCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
const friendLink = (code: string) => `${location.origin}/friends?add=${code}`

/** Friends: your code, requests waiting on you, and your friends list. Adding someone happens in a sheet. */
export function FriendsPage() {
  const friends = useQuery({ queryKey: queryKeys.friends, queryFn: friendsApi.mine })
  const [params] = useSearchParams()
  // Arriving from someone's QR (/friends?add=CODE) opens the add sheet with their code.
  const [adding, setAdding] = useState(() => params.has('add'))

  if (!friends.data) return friends.error ? <PageError error={friends.error} onRetry={() => friends.refetch()} /> : <Spinner />
  const { myCode, maxFriends, friends: list, incoming, outgoing } = friends.data

  return (
    <div className="mx-auto max-w-2xl">
      <TopBar title="Friends" />

      <div className="mb-5 flex items-center gap-2">
        <MyCode code={myCode} />
        <Button icon={<UserPlus className="size-5" />} onClick={() => setAdding(true)} className="shrink-0">
          Add
        </Button>
      </div>

      {incoming.length > 0 && (
        <Section title="Requests" count={incoming.length}>
          <ul className="card divide-y divide-white/8">
            {incoming.map((f) => (
              <IncomingRow key={f.player.userId} friend={f} />
            ))}
          </ul>
        </Section>
      )}

      <Section title="Friends" count={list.length} note={`${list.length} of ${maxFriends}`}>
        {list.length === 0 ? (
          <div className="card px-6 py-8 text-center">
            <p className="font-semibold">No friends yet</p>
            <p className="mt-1 text-sm text-muted">Share your code or show your QR at the courts. You can also add players from their profile.</p>
          </div>
        ) : (
          <Paged items={list} perPage={PER_PAGE}>
            {(page) => (
              <ul className="card divide-y divide-white/8">
                {page.map((f) => (
                  <FriendRow key={f.player.userId} friend={f} />
                ))}
              </ul>
            )}
          </Paged>
        )}
      </Section>

      {outgoing.length > 0 && (
        <Section title="Sent" count={outgoing.length}>
          <ul className="flex flex-wrap gap-2">
            {outgoing.map((f) => (
              <SentChip key={f.player.userId} friend={f} />
            ))}
          </ul>
        </Section>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a friend">
        {adding && <AddByCode initial={params.get('add') ?? ''} />}
      </Sheet>
    </div>
  )
}

/** Shows one page of items at a time, with previous / next underneath when there's more than one page. */
function Paged<T>({ items, perPage, children }: { items: T[]; perPage: number; children: (page: T[]) => ReactNode }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / perPage))
  const current = Math.min(page, pages - 1) // e.g. after removing the last friend on the last page
  return (
    <>
      {children(items.slice(current * perPage, (current + 1) * perPage))}
      {pages > 1 && (
        <nav className="mt-3 flex items-center justify-center gap-3" aria-label="Pages">
          <button
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            aria-label="Previous page"
            className="grid size-9 place-items-center rounded-xl border border-white/12 transition hover:border-lime/60 disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="min-w-16 text-center text-sm font-semibold">
            {current + 1} / {pages}
          </span>
          <button
            onClick={() => setPage(current + 1)}
            disabled={current === pages - 1}
            aria-label="Next page"
            className="grid size-9 place-items-center rounded-xl border border-white/12 transition hover:border-lime/60 disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </nav>
      )}
    </>
  )
}

function Section({ title, count, note, children }: { title: string; count: number; note?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-baseline gap-2 px-1">
        <span className="font-display text-lg font-extrabold">{title}</span>
        <span className="text-sm font-semibold text-muted">{count}</span>
        {note && <span className="ml-auto text-xs text-muted">{note}</span>}
      </h2>
      {children}
    </section>
  )
}

// ---- Your code ----------------------------------------------------------------------------------------

/** One slim row: your code, with copy, QR and share. */
function MyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: the code is on screen */
    }
  }
  const share = () =>
    navigator.share?.({ title: 'Add me on ChibiDink', text: `Add me on ChibiDink! My friend code is ${code}.`, url: friendLink(code) }).catch(() => {})

  return (
    <div className="card flex min-w-0 flex-1 items-center gap-1 py-1.5 pr-1.5 pl-4">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-muted">Your code</div>
        <div className="font-display text-xl leading-tight font-extrabold tracking-[0.18em] text-lime">{code}</div>
      </div>
      <IconButton label={copied ? 'Copied' : 'Copy code'} onClick={copy}>
        {copied ? <Check className="size-5 text-lime" /> : <Copy className="size-5" />}
      </IconButton>
      <IconButton label="Show QR" onClick={() => setQr(true)}>
        <QrCode className="size-5" />
      </IconButton>
      {'share' in navigator && (
        <IconButton label="Share" onClick={share}>
          <Share2 className="size-5" />
        </IconButton>
      )}

      <Sheet open={qr} onClose={() => setQr(false)} title="Scan to add me">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-3xl bg-snow p-4">
            <QRCodeSVG value={friendLink(code)} size={220} level="M" />
          </div>
          <div className="mt-4 font-display text-3xl font-extrabold tracking-[0.25em] text-lime">{code}</div>
          <p className="mt-2 max-w-xs text-sm text-muted">Let your friend scan this with their phone camera. It opens ChibiDink with your code filled in.</p>
        </div>
      </Sheet>
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid size-10 place-items-center rounded-xl text-white/80 transition hover:bg-white/8 hover:text-white">
      {children}
    </button>
  )
}

// ---- Add a friend (sheet) -------------------------------------------------------------------------------

/** Type a code; once it's complete you see whose it is before sending a request. */
function AddByCode({ initial }: { initial: string }) {
  const [, setParams] = useSearchParams()
  const [code, setCode] = useState(() => cleanCode(initial))
  const [focused, setFocused] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const complete = code.length === CODE_LENGTH
  const lookup = useQuery({ queryKey: ['friend-code', code], queryFn: () => friendsApi.lookup(code), enabled: complete, retry: false, staleTime: 0 })
  const send = useMutation({
    mutationFn: (who: FriendAction) => (who.status === 'Incoming' ? friendsApi.accept(who.player.userId) : friendsApi.add(who.player.userId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.friends })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me })
      void queryClient.invalidateQueries({ queryKey: ['friend-code'] })
    },
  })
  const change = (value: string) => {
    setCode(cleanCode(value))
    send.reset()
    setParams({}, { replace: true }) // a QR's code has been used
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">Enter their 6-character code. You'll see who it is before anything is sent.</p>
      {/* One real input (keyboard, paste, autofill) drawn as six boxes. */}
      <label className="relative block cursor-text" onClick={() => input.current?.focus()}>
        <div className="grid grid-cols-6 gap-1.5" aria-hidden>
          {Array.from({ length: CODE_LENGTH }, (_, i) => (
            <span
              key={i}
              className={clsx(
                'grid h-13 place-items-center rounded-xl border font-display text-2xl font-extrabold',
                code[i] ? 'border-lime/50 bg-night text-lime' : 'border-white/10 bg-night/50',
                focused && !complete && i === code.length && 'border-lime',
              )}
            >
              {code[i] ?? ''}
            </span>
          ))}
        </div>
        <input
          ref={input}
          value={code}
          onChange={(e) => change(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={!initial}
          aria-label="Friend code"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={CODE_LENGTH + 2}
          className="absolute inset-0 size-full cursor-text bg-transparent text-base text-transparent caret-transparent opacity-0"
        />
      </label>

      {complete && (
        <div className="mt-4">
          {lookup.isPending ? (
            <div className="grid h-16 place-items-center">
              <Spinner label="Looking up" />
            </div>
          ) : lookup.error ? (
            <ErrorNote error={lookup.error} />
          ) : lookup.data ? (
            <FoundPlayer who={send.data ?? lookup.data} sending={send.isPending} onSend={() => send.mutate(lookup.data!)} />
          ) : null}
          <div className="mt-2">
            <ErrorNote error={send.error} />
          </div>
        </div>
      )}
    </div>
  )
}

/** The player a code belongs to, with the one action that fits. */
function FoundPlayer({ who, sending, onSend }: { who: FriendAction; sending: boolean; onSend: () => void }) {
  const { player, status } = who
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-night/60 p-3">
      <PlayerAvatar player={player} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex py-1">
          <PlayerName player={player} className="truncate font-semibold" truncate />
        </div>
        <div className="text-xs text-muted">Level {player.characterLevel}</div>
      </div>
      {status === 'None' && (
        <Button size="sm" loading={sending} onClick={onSend}>
          Send request
        </Button>
      )}
      {status === 'Incoming' && (
        <Button size="sm" loading={sending} onClick={onSend}>
          Accept
        </Button>
      )}
      {status === 'Outgoing' && <span className="text-sm font-semibold text-lime">Request sent</span>}
      {status === 'Friends' && <span className="text-sm font-semibold text-lime">Friends</span>}
    </div>
  )
}

// ---- Rows -----------------------------------------------------------------------------------------------

function useFriendAction(fn: () => Promise<unknown>) {
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

/** A friend: name and level, View profile, and a quiet Remove. */
function FriendRow({ friend }: { friend: Friend }) {
  const remove = useFriendAction(() => friendsApi.remove(friend.player.userId))
  const name = friend.player.displayName
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex py-1">
          <PlayerName player={friend.player} className="truncate font-semibold" truncate />
        </div>
        <div className="text-xs text-muted">Level {friend.player.characterLevel}</div>
      </div>
      <Link
        to={`/players/${friend.player.userId}`}
        className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-lime transition hover:bg-lime/10"
      >
        View
      </Link>
      <button
        onClick={() => window.confirm(`Remove ${name} from your friends?`) && remove.mutate()}
        disabled={remove.isPending}
        className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50"
      >
        Remove
      </button>
    </li>
  )
}

function IncomingRow({ friend }: { friend: Friend }) {
  const accept = useFriendAction(() => friendsApi.accept(friend.player.userId))
  const decline = useFriendAction(() => friendsApi.remove(friend.player.userId))
  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <PlayerAvatar player={friend.player} size={40} />
        <Link to={`/players/${friend.player.userId}`} className="min-w-0 flex-1">
          <div className="flex py-1">
            <PlayerName player={friend.player} className="truncate font-semibold" truncate />
          </div>
          <div className="text-xs text-muted">Level {friend.player.characterLevel} · wants to be friends</div>
        </Link>
        <Button size="sm" loading={accept.isPending} disabled={decline.isPending} onClick={() => accept.mutate()}>
          Accept
        </Button>
        <button
          onClick={() => decline.mutate()}
          disabled={accept.isPending || decline.isPending}
          aria-label={`Decline ${friend.player.displayName}`}
          title="Decline"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/8 hover:text-white"
        >
          <X className="size-5" />
        </button>
      </div>
      <ErrorNote error={accept.error ?? decline.error} />
    </li>
  )
}

function SentChip({ friend }: { friend: Friend }) {
  const cancel = useFriendAction(() => friendsApi.remove(friend.player.userId))
  return (
    <li className="flex items-center gap-1 rounded-full border border-white/10 bg-surface py-1 pr-1 pl-3 text-sm">
      <span className="max-w-36 truncate font-semibold">{friend.player.displayName}</span>
      <span className="text-xs text-muted">pending</span>
      <button
        onClick={() => cancel.mutate()}
        disabled={cancel.isPending}
        aria-label={`Cancel request to ${friend.player.displayName}`}
        title="Cancel request"
        className="grid size-7 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
      >
        <X className="size-4" />
      </button>
    </li>
  )
}
