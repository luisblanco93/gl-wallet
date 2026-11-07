import { afterEach, describe, expect, it, vi } from 'vitest'
import { withDemoFaults, type DemoFault } from './demoFaults'
import { FX_BASE_URL } from './fx'

const API_URL = 'http://api.test'
const AUTH = { headers: { Authorization: 'Bearer fake-session' } }

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function setup(on: readonly DemoFault[], response: Response = jsonResponse(200, { ok: true }), apiUrl = API_URL) {
  const active = new Set<DemoFault>(on)
  const fetch = vi.fn<typeof globalThis.fetch>(() => Promise.resolve(response))
  const turnOff = vi.fn((fault: DemoFault) => active.delete(fault))
  const faultyFetch = withDemoFaults(fetch, {
    apiUrl,
    faults: { isOn: (fault) => active.has(fault), turnOff },
  })
  return { fetch, faultyFetch, turnOff }
}

async function bodyOf(response: Response): Promise<unknown> {
  return response.json()
}

afterEach(() => vi.useRealTimers())

describe('withDemoFaults', () => {
  it('passes every request and response through unchanged when no scenario is on', async () => {
    const response = jsonResponse(200, { accounts: [] })
    const { fetch, faultyFetch } = setup([], response)
    const init = { method: 'POST', body: '{}', ...AUTH }

    const result = await faultyFetch(`${API_URL}/transactions`, init)

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/transactions`, init)
    expect(result).toBe(response)
  })

  it('fails wallet requests without sending them when the API is offline, and leaves the FX source alone', async () => {
    const { fetch, faultyFetch } = setup(['offline'])

    await expect(faultyFetch(`${API_URL}/accounts`, AUTH)).rejects.toBeInstanceOf(TypeError)
    expect(fetch).not.toHaveBeenCalled()

    await faultyFetch(`${FX_BASE_URL}/dolares/oficial`)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('sends an operation for real and then loses the response, but never touches login', async () => {
    const { fetch, faultyFetch } = setup(['responseLost'])

    await expect(faultyFetch(`${API_URL}/transfers`, { method: 'POST', ...AUTH })).rejects.toBeInstanceOf(TypeError)
    expect(fetch).toHaveBeenCalledOnce()

    const login = await faultyFetch(`${API_URL}/auth/login`, { method: 'POST' })
    expect(login.status).toBe(200)
  })

  it('rejects with a field error or with 422 without sending, so nothing is created', async () => {
    const { fetch, faultyFetch } = setup(['serverValidation', 'transferInsufficientFunds'])

    const account = await faultyFetch(`${API_URL}/accounts`, { method: 'POST', ...AUTH })
    const transfer = await faultyFetch(`${API_URL}/transfers`, { method: 'POST', ...AUTH })

    expect(account.status).toBe(400)
    expect(await bodyOf(account)).toEqual({ errors: [{ field: 'name', message: expect.any(String) }] })
    expect(transfer.status).toBe(422)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('expires the session on the next request with a token only, and then turns itself off', async () => {
    const { faultyFetch, turnOff } = setup(['sessionExpired'])

    const login = await faultyFetch(`${API_URL}/auth/login`, { method: 'POST' })
    expect(login.status).toBe(200)

    const first = await faultyFetch(`${API_URL}/accounts`, AUTH)
    const second = await faultyFetch(`${API_URL}/accounts`, AUTH)
    expect(first.status).toBe(401)
    expect(turnOff).toHaveBeenCalledWith('sessionExpired')
    expect(second.status).toBe(200)
  })

  it('fails only the pending-transfers request when pending transfers cannot load', async () => {
    const { faultyFetch } = setup(['pendingUnavailable'])

    const pending = await faultyFetch(`${API_URL}/transactions?type=transfer&status=pending&page=1&pageSize=100`, AUTH)
    const list = await faultyFetch(`${API_URL}/transactions?page=1&pageSize=20`, AUTH)

    expect(pending.status).toBe(500)
    expect(list.status).toBe(200)
  })

  it('rewrites the tracked transfer status and keeps the rest of the response', async () => {
    const real = jsonResponse(200, { transfer: { id: 'transfer-1', status: 'completed', from: { id: 'out' }, to: null } })
    const { faultyFetch } = setup(['transferFailed'], real)

    const result = await faultyFetch(`${API_URL}/transfers/transfer-1`, AUTH)

    expect(await bodyOf(result)).toEqual({ transfer: { id: 'transfer-1', status: 'failed', from: { id: 'out' }, to: null } })
  })

  it('makes the FX source unreachable or returns an unexpected shape', async () => {
    const offline = setup(['fxOffline'])
    await expect(offline.faultyFetch(`${FX_BASE_URL}/dolares/oficial`)).rejects.toBeInstanceOf(TypeError)

    const invalid = setup(['fxInvalid'])
    const result = await invalid.faultyFetch(`${FX_BASE_URL}/cotizaciones/eur`)
    expect(result.status).toBe(200)
    expect(await bodyOf(result)).not.toHaveProperty('compra')
    expect(invalid.fetch).not.toHaveBeenCalled()
  })

  it('keeps returning HTML server errors across retries without sending the requests', async () => {
    const { fetch, faultyFetch } = setup(['serverError'])
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await faultyFetch(`${API_URL}/accounts`, AUTH)
      expect(response.status).toBe(500)
      expect(response.headers.get('Content-Type')).toContain('text/html')
      expect(await response.text()).toContain('<html>')
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns a non-JSON success for GET only and leaves writes unchanged', async () => {
    const real = jsonResponse(201, { account: { id: 'created' } })
    const { fetch, faultyFetch } = setup(['invalidSuccess'], real)
    const read = await faultyFetch(`${API_URL}/accounts`, AUTH)
    expect(read.status).toBe(200)
    expect(read.headers.get('Content-Type')).toContain('text/html')
    expect(fetch).not.toHaveBeenCalled()
    expect(await faultyFetch(`${API_URL}/accounts`, { method: 'POST', ...AUTH })).toBe(real)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('waits three seconds before sending a slow request', async () => {
    vi.useFakeTimers()
    const { fetch, faultyFetch } = setup(['slow'])
    const request = faultyFetch(`${API_URL}/accounts`, AUTH)
    await vi.advanceTimersByTimeAsync(2999)
    expect(fetch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect((await request).status).toBe(200)
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/accounts`, AUTH)
  })

  it('reports pending only for transfer tracking while leaving the actual movements untouched', async () => {
    const real = jsonResponse(200, { transfer: { id: 'transfer-1', status: 'completed' } })
    const { faultyFetch } = setup(['transferStuck'], real)
    const tracked = await faultyFetch(`${API_URL}/transfers/transfer-1`, AUTH)
    expect(await bodyOf(tracked)).toEqual({ transfer: { id: 'transfer-1', status: 'pending' } })
    expect(await faultyFetch(`${API_URL}/transactions`, AUTH)).toBe(real)
  })

  it('fails only the tracking request without sending it when tracking is unavailable', async () => {
    const { fetch, faultyFetch } = setup(['transferTrackingFails'])
    await expect(faultyFetch(`${API_URL}/transfers/transfer-1`, AUTH)).rejects.toBeInstanceOf(TypeError)
    expect(fetch).not.toHaveBeenCalled()
    expect((await faultyFetch(`${API_URL}/transfers`, { method: 'POST', ...AUTH })).status).toBe(200)
  })

  it.each([
    ['a rejection', () => jsonResponse(404, { error: 'Not found' })],
    ['a non-JSON body', () => new Response('<html>invalid</html>', { status: 200 })],
    ['a missing transfer', () => jsonResponse(200, { another: 'shape' })],
    ['a transfer array', () => jsonResponse(200, { transfer: [] })],
    ['a missing transfer status', () => jsonResponse(200, { transfer: { id: 'transfer-1' } })],
    ['an unknown transfer status', () => jsonResponse(200, { transfer: { id: 'transfer-1', status: 'unexpected' } })],
  ])('preserves %s instead of manufacturing a valid tracking response', async (_label, makeResponse) => {
    const real = makeResponse()
    const originalBody = await real.clone().text()
    const { faultyFetch } = setup(['transferFailed'], real)
    const result = await faultyFetch(`${API_URL}/transfers/transfer-1`, AUTH)
    expect(result).toBe(real)
    expect(await result.text()).toBe(originalBody)
  })

  it.each([
    'http://api.test.evil/accounts',
    'http://api.test:8080/accounts',
    'https://api.test/accounts',
    `${FX_BASE_URL}0/dolares/oficial`,
    'https://dolarapi.com.evil/v1/dolares/oficial',
    '/assets/icon.svg',
  ])('never intercepts a different origin or a similarly prefixed path: %s', async (url) => {
    const real = jsonResponse(200, { untouched: true })
    const { fetch, faultyFetch } = setup(['offline', 'fxOffline'], real)
    expect(await faultyFetch(url)).toBe(real)
    expect(fetch).toHaveBeenCalledWith(url)
  })

  it('matches a configured API path only at its boundary', async () => {
    const real = jsonResponse(200, { untouched: true })
    const { fetch, faultyFetch } = setup(['offline'], real, `${API_URL}/api`)
    expect(await faultyFetch(`${API_URL}/api2/accounts`)).toBe(real)
    expect(await faultyFetch(`${API_URL}/api/../accounts`)).toBe(real)
    await expect(faultyFetch(`${API_URL}/api/accounts`)).rejects.toBeInstanceOf(TypeError)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('reads the method and authorization from Request objects', async () => {
    const validation = setup(['serverValidation'])
    const request = new Request(`${API_URL}/transactions`, { method: 'POST', headers: AUTH.headers, body: '{}' })
    const response = await validation.faultyFetch(request)
    expect(response.status).toBe(400)
    expect(await bodyOf(response)).toEqual({ errors: [{ field: 'amount', message: expect.any(String) }] })
    expect(validation.fetch).not.toHaveBeenCalled()

    const expired = setup(['sessionExpired'])
    const authenticated = new Request(`${API_URL}/accounts`, AUTH)
    expect((await expired.faultyFetch(authenticated)).status).toBe(401)
    expect(expired.turnOff).toHaveBeenCalledWith('sessionExpired')
  })

  it('lets explicit init values override Request method and headers as fetch does', async () => {
    const real = jsonResponse(200, { ok: true })
    const { fetch, faultyFetch } = setup(['serverValidation', 'sessionExpired'], real)
    const request = new Request(`${API_URL}/transactions`, { method: 'POST', headers: AUTH.headers })
    const init = { method: 'GET', headers: {} }
    expect(await faultyFetch(request, init)).toBe(real)
    expect(fetch).toHaveBeenCalledWith(request, init)
  })

  it('rejects movement creation and edits with their mapped field without sending them', async () => {
    const { fetch, faultyFetch } = setup(['serverValidation'])
    for (const [method, path, field] of [
      ['POST', '/transactions', 'amount'],
      ['PATCH', '/transactions/movement-1', 'description'],
    ]) {
      const result = await faultyFetch(`${API_URL}${path}`, { method, ...AUTH })
      expect(result.status).toBe(400)
      expect(await bodyOf(result)).toEqual({ errors: [{ field, message: expect.any(String) }] })
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('lets a connection outage take precedence over an expired session or server response', async () => {
    const { fetch, faultyFetch, turnOff } = setup(['offline', 'sessionExpired', 'serverError'])
    await expect(faultyFetch(`${API_URL}/accounts`, AUTH)).rejects.toBeInstanceOf(TypeError)
    expect(turnOff).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
})
