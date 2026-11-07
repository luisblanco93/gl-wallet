import { FX_BASE_URL } from './fx'

/** The failure scenarios the demo panel can turn on (demo-panel spec, "Simulated failures"). */
export const DEMO_FAULTS = [
  'offline',
  'serverError',
  'slow',
  'invalidSuccess',
  'sessionExpired',
  'pendingUnavailable',
  'responseLost',
  'serverValidation',
  'transferInsufficientFunds',
  'transferStuck',
  'transferFailed',
  'transferTrackingFails',
  'fxOffline',
  'fxInvalid',
] as const

export type DemoFault = (typeof DEMO_FAULTS)[number]

export type DemoFaultSource = {
  readonly isOn: (fault: DemoFault) => boolean
  /** Lets a one-shot scenario ("Sesión vencida") switch itself off once it fires. */
  readonly turnOff: (fault: DemoFault) => void
}

type Fetch = typeof globalThis.fetch

/** Long enough to see loading states and to try a double submit. */
const SLOW_RESPONSE_MS = 3000

/** The 400 names a field each form already maps to its own copy; the message is never shown. */
const VALIDATION_FIELDS: readonly { method: string; pattern: RegExp; field: string }[] = [
  { method: 'POST', pattern: /^\/accounts$/, field: 'name' },
  { method: 'POST', pattern: /^\/transactions$/, field: 'amount' },
  { method: 'PATCH', pattern: /^\/transactions\/[^/]+$/, field: 'description' },
]

const TRANSFER_STATUS_PATH = /^\/transfers\/[^/]+$/

type WalletRequest = {
  readonly method: string
  readonly path: string
  readonly params: URLSearchParams
  readonly hasToken: boolean
}

/** What browsers throw when a request never gets a response. */
function networkFailure(): TypeError {
  return new TypeError('Failed to fetch')
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function htmlResponse(status: number): Response {
  return new Response('<!DOCTYPE html><html><body><pre>Simulated failure</pre></body></html>', {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function urlOf(input: Parameters<Fetch>[0]): string {
  return input instanceof Request ? input.url : String(input)
}

function pathUnderBase(url: string, base: string): string | undefined {
  try {
    const target = new URL(url)
    const configured = new URL(base)
    const prefix = configured.pathname.replace(/\/+$/, '')
    if (target.origin !== configured.origin) return undefined
    if (target.pathname === prefix || target.pathname.startsWith(`${prefix}/`)) {
      return target.pathname.slice(prefix.length) || '/'
    }
  } catch {
    // Relative or invalid URLs remain the responsibility of the original fetch.
  }
  return undefined
}

function describeWalletRequest(args: Parameters<Fetch>, path: string): WalletRequest {
  const [input, init] = args
  const original = input instanceof Request ? input : undefined
  return {
    method: (init?.method ?? original?.method ?? 'GET').toUpperCase(),
    path,
    params: new URL(urlOf(input)).searchParams,
    hasToken: new Headers(init?.headers ?? original?.headers).has('Authorization'),
  }
}

function isPendingTransfersQuery(request: WalletRequest): boolean {
  return (
    request.method === 'GET' &&
    request.path === '/transactions' &&
    request.params.get('type') === 'transfer' &&
    request.params.get('status') === 'pending'
  )
}

function isOperation(request: WalletRequest): boolean {
  return (request.method === 'POST' || request.method === 'PATCH') && request.path !== '/auth/login'
}

/** `{ transfer: { status } }` with the status replaced; anything unexpected is returned as it came. */
async function withTransferStatus(response: Response, status: 'pending' | 'failed'): Promise<Response> {
  if (!response.ok) return response
  const body: unknown = await response.clone().json().catch(() => undefined)
  if (typeof body !== 'object' || body === null || !('transfer' in body)) return response
  const transfer = body.transfer
  if (typeof transfer !== 'object' || transfer === null || Array.isArray(transfer)) return response
  if (!('status' in transfer) || typeof transfer.status !== 'string') return response
  if (!['pending', 'completed', 'failed'].includes(transfer.status)) return response
  return jsonResponse(response.status, { ...body, transfer: { ...transfer, status } })
}

/** A fake response when a scenario answers instead of the server; `undefined` to send the request. */
function fakeWalletResponse(request: WalletRequest, faults: DemoFaultSource): Response | undefined {
  if (faults.isOn('sessionExpired') && request.hasToken) {
    faults.turnOff('sessionExpired')
    return jsonResponse(401, { error: 'Simulated expired session' })
  }
  if (faults.isOn('serverError')) return htmlResponse(500)
  if (faults.isOn('pendingUnavailable') && isPendingTransfersQuery(request)) return htmlResponse(500)
  if (faults.isOn('invalidSuccess') && request.method === 'GET') return htmlResponse(200)
  if (faults.isOn('serverValidation')) {
    const rule = VALIDATION_FIELDS.find((item) => item.method === request.method && item.pattern.test(request.path))
    if (rule) return jsonResponse(400, { errors: [{ field: rule.field, message: 'Simulated validation error' }] })
  }
  if (faults.isOn('transferInsufficientFunds') && request.method === 'POST' && request.path === '/transfers') {
    return jsonResponse(422, { error: 'Simulated insufficient funds' })
  }
  return undefined
}

async function walletFetch(
  fetch: Fetch,
  args: Parameters<Fetch>,
  request: WalletRequest,
  faults: DemoFaultSource,
): Promise<Response> {
  if (faults.isOn('slow')) await wait(SLOW_RESPONSE_MS)
  if (faults.isOn('offline')) throw networkFailure()

  const fake = fakeWalletResponse(request, faults)
  if (fake) return fake

  const isTransferStatus = request.method === 'GET' && TRANSFER_STATUS_PATH.test(request.path)
  if (isTransferStatus && faults.isOn('transferTrackingFails')) throw networkFailure()

  const response = await fetch(...args)
  if (faults.isOn('responseLost') && isOperation(request)) throw networkFailure()
  if (isTransferStatus && faults.isOn('transferFailed')) return withTransferStatus(response, 'failed')
  if (isTransferStatus && faults.isOn('transferStuck')) return withTransferStatus(response, 'pending')
  return response
}

function fxFetch(fetch: Fetch, args: Parameters<Fetch>, faults: DemoFaultSource): Promise<Response> {
  if (faults.isOn('fxOffline')) return Promise.reject(networkFailure())
  if (faults.isOn('fxInvalid')) return Promise.resolve(jsonResponse(200, { simulated: true }))
  return fetch(...args)
}

/**
 * Wraps the app's single `fetch` so each demo scenario goes through the real client: parsing, error
 * mapping, retries, the 401 handler and the outcome refetches. With every scenario off it is a pass-through.
 */
export function withDemoFaults(fetch: Fetch, options: { readonly apiUrl: string; readonly faults: DemoFaultSource }): Fetch {
  const { apiUrl, faults } = options
  return (...args) => {
    const url = urlOf(args[0])
    if (pathUnderBase(url, FX_BASE_URL) !== undefined) return fxFetch(fetch, args, faults)
    const path = pathUnderBase(url, apiUrl)
    if (path === undefined) return fetch(...args)
    return walletFetch(fetch, args, describeWalletRequest(args, path), faults)
  }
}
