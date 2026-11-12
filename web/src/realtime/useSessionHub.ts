import { HubConnectionBuilder, HubConnectionState, LogLevel, type IRetryPolicy } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { API_BASE } from '../api/api'
import { currentToken } from '../auth/authStore'
import { queryKeys } from '../hooks/queries'

export type LiveStatus = 'connecting' | 'live' | 'offline'

/**
 * Never give up: phones at a court lock their screens and drop Wi-Fi all the time. Retry quickly at first,
 * then every 30 seconds. (SignalR's default stops after 4 tries, about 42 seconds, and stays offline.)
 */
const keepTrying: IRetryPolicy = {
  nextRetryDelayInMilliseconds: ({ previousRetryCount }) => [0, 2_000, 5_000, 10_000][previousRetryCount] ?? 30_000,
}

/** Reads the live state (the state changes during awaits, which TypeScript's narrowing doesn't know). */
const stateOf = (connection: { state: HubConnectionState }) => connection.state

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
      .withAutomaticReconnect(keepTrying)
      .configureLogging(LogLevel.Warning)
      .build()

    let cancelled = false
    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) })
    const subscribe = async () => {
      await connection.invoke('Subscribe', sessionId)
      if (!cancelled) setStatus('live')
    }

    /** Starts (or restarts) the connection. A failed start is retried when the phone wakes or the network returns. */
    const connect = async () => {
      if (cancelled || connection.state !== HubConnectionState.Disconnected) return
      setStatus('connecting')
      try {
        await connection.start()
        await subscribe()
        refresh() // catch up on anything missed while disconnected
      } catch {
        if (!cancelled) setStatus('offline')
        // A started connection that failed to subscribe would sit idle: stop it so the next wake retries.
        if (stateOf(connection) === HubConnectionState.Connected) void connection.stop()
      }
    }

    connection.on('SessionChanged', refresh)
    connection.onreconnecting(() => !cancelled && setStatus('connecting'))
    connection.onreconnected(async () => {
      try {
        await subscribe()
        refresh()
      } catch {
        // Couldn't rejoin the session's channel: drop the connection so a wake-up starts it fresh.
        void connection.stop()
      }
    })
    connection.onclose(() => !cancelled && setStatus('offline'))

    // The browser may freeze a hidden page; when it comes back (or the network does), reconnect and catch up.
    const onWake = () => {
      if (document.visibilityState !== 'visible') return
      if (connection.state === HubConnectionState.Disconnected) void connect()
      else if (connection.state === HubConnectionState.Connected) refresh()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('online', onWake)

    void connect()

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('online', onWake)
      if (connection.state !== HubConnectionState.Disconnected) void connection.stop()
    }
  }, [sessionId, queryClient])

  return status
}
