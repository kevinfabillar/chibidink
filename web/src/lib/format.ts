import { useEffect, useState } from 'react'
import type { MatchFormat, MatchStatus } from '../api/types'

export const formatLabel = (f: MatchFormat) => (f === 'Singles' ? 'Singles (1v1)' : 'Doubles (2v2)')
export const friendlyFormat = (f: MatchFormat) => `Friendly ${f}`

export const matchStatusLabel: Record<MatchStatus, string> = {
  Proposed: 'Proposed',
  AwaitingConfirmation: 'Next Match',
  Ready: 'Ready',
  Playing: 'Playing',
  PendingResult: 'Score Pending',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  Voided: 'Voided',
}

export const winRateText = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate)}%`)

export const teamNames = (names: string[]) => names.join(' & ')

export function durationText(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function minutesAgo(iso: string | null, now: number) {
  if (!iso) return ''
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
  return minutes < 1 ? 'just now' : `${minutes} min`
}

export function dateTimeText(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Re-renders every `intervalMs` so countdowns and timers stay current. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
