/** Error with the server's user-facing message (from problem+json). */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string[]>

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const SERVER_TROUBLE = 'ChibiDink is having trouble right now. Please try again in a moment.'

type TokenProvider = () => string | null
type UnauthorizedHandler = () => void

/** Thin fetch wrapper: JSON in/out, bearer auth, and consistent errors. */
export class HttpClient {
  private readonly baseUrl: string
  private readonly getToken: TokenProvider
  private readonly onUnauthorized: UnauthorizedHandler

  constructor(baseUrl: string, getToken: TokenProvider, onUnauthorized: UnauthorizedHandler) {
    this.baseUrl = baseUrl
    this.getToken = getToken
    this.onUnauthorized = onUnauthorized
  }

  get<T>(path: string) {
    return this.request<T>('GET', path)
  }
  post<T = void>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body)
  }
  put<T = void>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const token = this.getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    let response: Response
    try {
      response = await fetch(this.baseUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError(0, "Can't reach ChibiDink. Check your internet connection and try again.")
    }

    if (response.status === 401 && token) this.onUnauthorized()
    if (!response.ok) throw await HttpClient.toError(response)
    if (response.status === 204) return undefined as T

    const text = await response.text()
    try {
      return (text ? JSON.parse(text) : undefined) as T
    } catch {
      // Not JSON (e.g. a proxy's HTML error page): treat it as a server problem, never show the raw text.
      throw new ApiError(502, SERVER_TROUBLE)
    }
  }

  /**
   * The message users see. 4xx answers carry messages written for users (problem+json `detail` or a
   * field error). 5xx and anything unexpected get a fixed message, so server internals never show.
   */
  private static async toError(response: Response): Promise<ApiError> {
    const status = response.status
    if (status >= 500) return new ApiError(status, SERVER_TROUBLE)
    if (status === 429) return new ApiError(status, 'Too many requests. Wait a moment and try again.')
    let problem: { detail?: string; title?: string; errors?: Record<string, string[]> } = {}
    try {
      problem = await response.json()
    } catch {
      // no body or not JSON: fall back to the status message below
    }
    const fieldErrors = problem.errors ?? {}
    const firstFieldError = Object.values(fieldErrors).flat()[0]
    const fallback =
      status === 401 ? 'Your sign-in has expired. Please sign in again.'
      : status === 403 ? "You don't have access to this."
      : status === 404 ? "We couldn't find that."
      : 'That request could not be completed.'
    return new ApiError(status, problem.detail ?? firstFieldError ?? fallback, fieldErrors)
  }
}
