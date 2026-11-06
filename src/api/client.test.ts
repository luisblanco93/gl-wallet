import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'
import { ApiError } from './errors'

const BASE_URL = 'http://api.test'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function htmlResponse(status: number, html: string): Response {
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

function setup(response: Response | Error, token: string | null = 'fake-token-user-1') {
  const fetch = vi.fn<typeof globalThis.fetch>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  )
  const onUnauthorized = vi.fn()
  const client = createApiClient({ baseUrl: BASE_URL, fetch, getToken: () => token, onUnauthorized })
  return { client, fetch, onUnauthorized }
}

function sentRequest(fetch: ReturnType<typeof setup>['fetch']) {
  const call = fetch.mock.calls[0]
  if (!call) throw new Error('fetch was not called')
  const [url, init] = call
  return { url: String(url), init: init ?? {}, headers: new Headers(init?.headers) }
}

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('expected the request to fail')
}

describe('createApiClient', () => {
  it('sends the session token on authenticated requests', async () => {
    const { client, fetch } = setup(jsonResponse(200, { accounts: [] }))
    await client.request('GET', '/accounts')
    expect(sentRequest(fetch).headers.get('Authorization')).toBe('Bearer fake-token-user-1')
  })

  it('does not send a token when the request is not authenticated', async () => {
    const { client, fetch } = setup(jsonResponse(200, {}))
    await client.request('POST', '/auth/login', { body: { email: 'a@b.c', password: 'x' }, auth: false })
    expect(sentRequest(fetch).headers.has('Authorization')).toBe(false)
  })

  it('sends a JSON body with its content type', async () => {
    const { client, fetch } = setup(jsonResponse(201, {}))
    await client.request('POST', '/transactions', { body: { amount: 1234.56 } })
    const { init, headers } = sentRequest(fetch)
    expect(init.method).toBe('POST')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(init.body).toBe('{"amount":1234.56}')
  })

  it('sends no content type without a body', async () => {
    const { client, fetch } = setup(jsonResponse(200, {}))
    await client.request('GET', '/accounts')
    expect(sentRequest(fetch).headers.has('Content-Type')).toBe(false)
  })

  it('builds the query string, skipping empty values', async () => {
    const { client, fetch } = setup(jsonResponse(200, {}))
    await client.request('GET', '/transactions', {
      query: { accountId: 'acc-1', type: undefined, search: '', page: 2 },
    })
    expect(sentRequest(fetch).url).toBe(`${BASE_URL}/transactions?accountId=acc-1&page=2`)
  })

  it('returns the parsed JSON body on success', async () => {
    const { client } = setup(jsonResponse(200, { accounts: [{ id: 'acc-1' }] }))
    await expect(client.request('GET', '/accounts')).resolves.toEqual({ accounts: [{ id: 'acc-1' }] })
  })

  it('normalizes a field validation error', async () => {
    const { client } = setup(
      jsonResponse(400, { errors: [{ field: 'amount', message: 'amount must be at least 0.01' }] }),
    )
    const error = await caught(client.request('POST', '/transactions', { body: {} }))
    expect(error.kind).toBe('validation')
    expect(error.fieldErrors).toEqual({ amount: 'amount must be at least 0.01' })
  })

  it('normalizes a message error', async () => {
    const { client } = setup(jsonResponse(400, { error: 'Transfers cannot be edited' }))
    const error = await caught(client.request('PATCH', '/transactions/t-1', { body: {} }))
    expect(error.kind).toBe('badRequest')
    expect(error.detail).toBe('Transfers cannot be edited')
  })

  it('discards an HTML error body and maps by status only', async () => {
    const { client } = setup(htmlResponse(400, '<pre>SyntaxError at /srv/index.ts:12</pre>'))
    const error = await caught(client.request('POST', '/transactions', { body: {} }))
    expect(error.kind).toBe('badRequest')
    expect(error.detail).toBeUndefined()
    expect(error.message).not.toContain('/srv')
  })

  it('treats a JSON content type with an unreadable body as no body', async () => {
    const broken = new Response('{not json', { status: 500, headers: { 'Content-Type': 'application/json' } })
    const { client } = setup(broken)
    const error = await caught(client.request('GET', '/accounts'))
    expect(error.kind).toBe('server')
  })

  it('rejects a successful response without a JSON body as server', async () => {
    const { client } = setup(htmlResponse(200, '<html></html>'))
    const error = await caught(client.request('GET', '/accounts'))
    expect(error.kind).toBe('server')
  })

  it('maps 404 and 422 by status', async () => {
    const notFound = setup(jsonResponse(404, { error: 'Account not found' }))
    expect((await caught(notFound.client.request('GET', '/accounts/x'))).kind).toBe('notFound')
    const noFunds = setup(jsonResponse(422, { error: 'Insufficient funds in source account' }))
    expect((await caught(noFunds.client.request('POST', '/transfers', { body: {} }))).kind).toBe(
      'insufficientFunds',
    )
  })

  it('maps a failed fetch to network', async () => {
    const { client, onUnauthorized } = setup(new TypeError('Failed to fetch'))
    const error = await caught(client.request('GET', '/accounts'))
    expect(error.kind).toBe('network')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('reports a 401 on an authenticated request', async () => {
    const { client, onUnauthorized } = setup(jsonResponse(401, { error: 'Invalid token' }))
    const error = await caught(client.request('GET', '/accounts'))
    expect(error.kind).toBe('unauthorized')
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('does not report a 401 from an unauthenticated request (wrong credentials)', async () => {
    const { client, onUnauthorized } = setup(jsonResponse(401, { error: 'Invalid email or password' }))
    const error = await caught(client.request('POST', '/auth/login', { body: {}, auth: false }))
    expect(error.kind).toBe('unauthorized')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
