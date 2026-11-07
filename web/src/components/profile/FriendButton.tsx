import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Clock, UserCheck, UserMinus, UserPlus } from 'lucide-react'
import { friendsApi } from '../../api/api'
import type { FriendStatus } from '../../api/types'
import { queryKeys } from '../../hooks/queries'
import { Button } from '../ui/Button'
import { ErrorNote } from '../ui/primitives'

/** On someone else's profile: add them, see that you asked, accept their request, or unfriend. */
export function FriendButton({ userId, name, status }: { userId: string; name: string; status: FriendStatus }) {
  const queryClient = useQueryClient()
  const action = useMutation({
    mutationFn: async (kind: 'add' | 'accept' | 'remove'): Promise<unknown> =>
      kind === 'add' ? friendsApi.add(userId) : kind === 'accept' ? friendsApi.accept(userId) : friendsApi.remove(userId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.player(userId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.friends })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me })
    },
  })
  const busy = action.isPending

  return (
    <div className="space-y-2">
      {status === 'None' && (
        <Button block icon={<UserPlus className="size-5" />} loading={busy} onClick={() => action.mutate('add')}>
          Add friend
        </Button>
      )}
      {status === 'Outgoing' && (
        <Button block variant="dark" icon={<Clock className="size-5" />} loading={busy} onClick={() => action.mutate('remove')} title="Tap to cancel the request">
          Requested · Cancel
        </Button>
      )}
      {status === 'Incoming' && (
        <div className="flex gap-2">
          <Button block icon={<Check className="size-5" />} loading={busy && action.variables === 'accept'} disabled={busy} onClick={() => action.mutate('accept')}>
            Accept
          </Button>
          <Button block variant="dark" loading={busy && action.variables === 'remove'} disabled={busy} onClick={() => action.mutate('remove')}>
            Decline
          </Button>
        </div>
      )}
      {status === 'Friends' && (
        <div className="flex gap-2">
          <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-lime/15 font-display font-bold text-lime">
            <UserCheck className="size-5" />
            Friends
          </div>
          <Button
            variant="dark"
            aria-label={`Remove ${name} from friends`}
            title="Remove friend"
            loading={busy}
            onClick={() => window.confirm(`Remove ${name} from your friends?`) && action.mutate('remove')}
          >
            <UserMinus className="size-5" />
          </Button>
        </div>
      )}
      <ErrorNote error={action.error} />
    </div>
  )
}
