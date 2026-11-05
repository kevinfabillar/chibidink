import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { API_BASE } from '../api/api'
import { currentToken } from '../auth/authStore'
import { queryKeys } from '../hooks/queries'

export type LiveStatus = 'connecting' | 'live' | 'offline'

/**
 * Subscribes to a session's realtime channel. The server only says "something changed";
 * we refetch the session view so the server stays the source of truth.
 */
export function useSessionHub(sessionId: string | undefined): LiveStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>('connecting')

  useEffect(() => {
    if (!sessionId) return
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/session`, { accessTokenFactory: () => currentToken() ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) })
    connection.on('SessionChanged', refresh)
    connection.onreconnecting(() => setStatus('connecting'))
    connection.onreconnected(async () => {
      await connection.invoke('Subscribe', sessionId)
      setStatus('live')
      refresh()
    })
    connection.onclose(() => setStatus('offline'))

    let cancelled = false
    connection
      .start()
      .then(() => connection.invoke('Subscribe', sessionId))
      .then(() => !cancelled && setStatus('live'))
      .catch(() => !cancelled && setStatus('offline'))

    return () => {
      cancelled = true
      if (connection.state !== HubConnectionState.Disconnected) void connection.stop()
    }
  }, [sessionId, queryClient])

  return status
}
