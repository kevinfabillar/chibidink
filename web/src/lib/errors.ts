import { ApiError } from '../api/httpClient'

// One place that decides what users see when something fails. Server messages are shown only for
// 4xx answers (they're written for users, e.g. "Only the session organizer can enter scores.");
// anything else gets a plain message, never stack traces, database errors or code details.

export type ErrorKind = 'notFound' | 'unauthorized' | 'forbidden' | 'server' | 'offline' | 'crash'

export function errorKind(error: unknown): ErrorKind {
  if (!(error instanceof ApiError)) return 'crash'
  if (error.status === 0) return 'offline'
  if (error.status === 401) return 'unauthorized'
  if (error.status === 403) return 'forbidden'
  if (error.status === 404) return 'notFound'
  return 'server'
}

export const GENERIC_ERROR = 'Something went wrong. Please try again.'

/** A short, safe sentence for inline error boxes. */
export function friendlyMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return GENERIC_ERROR // a bug in the app: don't show its internals
  if (error.status === 0 || error.status >= 500) return error.message // already friendly (set by the client)
  return error.message || GENERIC_ERROR
}

/** Worth trying again (the same request may well work in a moment). */
export const isRetryable = (error: unknown) => {
  const kind = errorKind(error)
  return kind === 'offline' || kind === 'server' || kind === 'crash'
}
