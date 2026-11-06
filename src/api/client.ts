import { networkError, toApiError, untrustworthyResponse } from './errors'

export type HttpMethod = 'GET' | 'POST' | 'PATCH'
export type QueryParams = Readonly<Record<string, string | number | undefined>>

export type RequestOptions = {
  readonly body?: unknown
  readonly query?: QueryParams
  /** `false` only for login: no token is sent and a 401 means wrong credentials. */
  readonly auth?: boolean
}

export type ApiClient = {
  /** Resolves with the parsed JSON body; rejects only with `ApiError`. */
  request(method: HttpMethod, path: string, options?: RequestOptions): Promise<unknown>
}

export type ApiClientConfig = {
  readonly baseUrl: string
  readonly fetch: typeof globalThis.fetch
  readonly getToken: () => string | null
  /** Called when an authenticated request gets a 401 (the session is no longer valid). */
  readonly onUnauthorized: () => void
}

function buildUrl(baseUrl: string, path: string, query: QueryParams = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  return `${baseUrl}${path}${search ? `?${search}` : ''}`
}

function buildHeaders(hasBody: boolean, token: string | null): Headers {
  const headers = new Headers({ Accept: 'application/json' })
  if (hasBody) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

/** The parsed body when the response says it is JSON; `undefined` otherwise (HTML stack traces are discarded). */
async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('application/json')) return undefined
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  // Called unbound: browsers reject `fetch` invoked as a method of another object.
  const { baseUrl, fetch, getToken, onUnauthorized } = config

  async function request(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<unknown> {
    const { body, query, auth = true } = options
    const hasBody = body !== undefined

    let response: Response
    try {
      response = await fetch(buildUrl(baseUrl, path, query), {
        method,
        headers: buildHeaders(hasBody, auth ? getToken() : null),
        body: hasBody ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw networkError()
    }

    const data = await readJson(response)
    if (response.ok) {
      if (data === undefined) throw untrustworthyResponse(`${method} ${path}: expected a JSON body`)
      return data
    }
    if (response.status === 401 && auth) onUnauthorized()
    throw toApiError(response.status, data)
  }

  return { request }
}
