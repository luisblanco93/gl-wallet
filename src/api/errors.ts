export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'notFound'
  | 'insufficientFunds'
  | 'badRequest'
  | 'server'
  | 'network'

export type FieldErrors = Readonly<Record<string, string>>

const NO_FIELD_ERRORS: FieldErrors = {}
const MAX_RETRIES = 1

/**
 * The only error the API layer throws. `message` is the kind, never the response body;
 * `detail` keeps the API message for logging and is never shown to the user.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly fieldErrors: FieldErrors
  readonly detail: string | undefined

  constructor(kind: ApiErrorKind, options: { fieldErrors?: FieldErrors; detail?: string } = {}) {
    super(`ApiError: ${kind}`)
    this.name = 'ApiError'
    this.kind = kind
    this.fieldErrors = options.fieldErrors ?? NO_FIELD_ERRORS
    this.detail = options.detail
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** `{ errors: [{ field, message }] }` → one message per field (the first one wins). */
function readFieldErrors(body: unknown): FieldErrors | null {
  if (!isRecord(body) || !Array.isArray(body.errors) || body.errors.length === 0) return null

  const entries: [string, string][] = []
  for (const item of body.errors) {
    if (!isRecord(item) || typeof item.field !== 'string' || typeof item.message !== 'string') return null
    if (!entries.some(([field]) => field === item.field)) entries.push([item.field, item.message])
  }
  return Object.fromEntries(entries)
}

/** `{ error: "…" }` → the message, kept only for logging. */
function readMessage(body: unknown): string | undefined {
  return isRecord(body) && typeof body.error === 'string' ? body.error : undefined
}

/** Maps a non-2xx status and its parsed JSON body (`undefined` when it was not JSON) to one error kind. */
export function toApiError(status: number, body: unknown): ApiError {
  if (status === 400) {
    const fieldErrors = readFieldErrors(body)
    if (fieldErrors) return new ApiError('validation', { fieldErrors })
  }
  const detail = readMessage(body)
  if (status === 401) return new ApiError('unauthorized', { detail })
  if (status === 404) return new ApiError('notFound', { detail })
  if (status === 422) return new ApiError('insufficientFunds', { detail })
  if (status >= 400 && status < 500) return new ApiError('badRequest', { detail })
  return new ApiError('server', { detail })
}

export function networkError(): ApiError {
  return new ApiError('network')
}

/** A 2xx response whose data money rules cannot trust. */
export function untrustworthyResponse(detail: string): ApiError {
  return new ApiError('server', { detail })
}

/** Query retry policy: `network` and `server` once, never 4xx, never unknown errors (bugs). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  return (error.kind === 'network' || error.kind === 'server') && failureCount < MAX_RETRIES
}
