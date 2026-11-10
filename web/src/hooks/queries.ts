import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cosmeticsApi, profileApi, sessionApi } from '../api/api'
import { useAuth } from '../auth/authStore'

export const queryKeys = {
  me: ['me'] as const,
  mySessions: ['sessions', 'mine'] as const,
  session: (id: string) => ['session', id] as const,
  audit: (id: string) => ['session', id, 'audit'] as const,
  player: (id: string) => ['player', id] as const,
  cosmetics: ['cosmetics'] as const,
  friends: ['friends'] as const,
  /** Under the session's key, so live session updates refresh it too. */
  kudos: (sessionId: string) => ['session', sessionId, 'kudos'] as const,
}

export function useMe() {
  const token = useAuth((s) => s.token)
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: profileApi.me,
    enabled: !!token,
    refetchInterval: 20_000, // keeps the notification bell current
  })
}

export function useMySessions() {
  return useQuery({ queryKey: queryKeys.mySessions, queryFn: sessionApi.mine })
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.session(id ?? ''),
    queryFn: () => sessionApi.get(id!),
    enabled: !!id,
    refetchInterval: 60_000, // safety net if the realtime connection drops (changes arrive live)
  })
}

export function useCosmetics(enabled = true) {
  return useQuery({ queryKey: queryKeys.cosmetics, queryFn: cosmeticsApi.get, enabled })
}

/** A mutation that refreshes the session afterwards. Errors surface via the returned state. */
export function useSessionAction<TArgs = void, TResult = unknown>(
  sessionId: string,
  action: (args: TArgs) => Promise<TResult>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me })
    },
  })
}

/** Buying or equipping changes coins and looks everywhere, so refresh everything. */
export function useCosmeticAction<TArgs = void>(action: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: action, onSuccess: () => queryClient.invalidateQueries() })
}
