import { describe, expect, it, vi } from 'vitest'
import { createFxApi } from './fx'

const USD_QUOTE = {
  moneda: 'USD',
  casa: 'oficial',
  nombre: 'Oficial',
  compra: 1520,
  venta: 1570,
  fechaActualizacion: '2026-11-05T17:00:00.000Z',
}
const EUR_QUOTE = {
  moneda: 'EUR',
  casa: 'oficial',
  nombre: 'Euro',
  compra: 1724.414,
  venta: 1738.3784,
  fechaActualizacion: '2026-11-05T17:59:00.000Z',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function fakeFetch(usd: () => Promise<Response>, eur: () => Promise<Response>) {
  return vi.fn<typeof fetch>((input) => (String(input).endsWith('/dolares/oficial') ? usd() : eur()))
}

describe('getFxRates', () => {
  it('maps both official quotes to reference rates dated by the older update', async () => {
    const fetch = fakeFetch(
      () => Promise.resolve(jsonResponse(USD_QUOTE)),
      () => Promise.resolve(jsonResponse(EUR_QUOTE)),
    )

    const rates = await createFxApi(fetch).getFxRates()

    expect(fetch.mock.calls.map(([url]) => String(url)).sort()).toEqual([
      'https://dolarapi.com/v1/cotizaciones/eur',
      'https://dolarapi.com/v1/dolares/oficial',
    ])
    expect(rates.arsPerUsd).toBe(1545)
    expect(rates.arsPerEur).toBeCloseTo(1731.3962, 6)
    expect(rates.updatedAt).toBe('2026-11-05T17:00:00.000Z')
  })

  it('sends no token, cookies, referrer or custom headers to the external source', async () => {
    const fetch = fakeFetch(
      () => Promise.resolve(jsonResponse(USD_QUOTE)),
      () => Promise.resolve(jsonResponse(EUR_QUOTE)),
    )

    await createFxApi(fetch).getFxRates()

    for (const [, init] of fetch.mock.calls) {
      expect(init).toEqual({ credentials: 'omit', referrerPolicy: 'no-referrer' })
    }
  })

  it('rejects a quote without numeric buy and sell, without a valid date, or out of any plausible range', async () => {
    for (const malformed of [
      { ...USD_QUOTE, compra: '1520' },
      { ...USD_QUOTE, venta: undefined },
      { ...USD_QUOTE, fechaActualizacion: 'ayer' },
      { ...USD_QUOTE, compra: 1e-300 },
      { ...USD_QUOTE, venta: 1e300 },
    ]) {
      const fetch = fakeFetch(
        () => Promise.resolve(jsonResponse(malformed)),
        () => Promise.resolve(jsonResponse(EUR_QUOTE)),
      )
      await expect(createFxApi(fetch).getFxRates()).rejects.toThrow()
    }
  })

  it('rejects when either request fails, so no partial rates are used', async () => {
    const offline = fakeFetch(
      () => Promise.resolve(jsonResponse(USD_QUOTE)),
      () => Promise.reject(new TypeError('Failed to fetch')),
    )
    await expect(createFxApi(offline).getFxRates()).rejects.toThrow()

    const serverError = fakeFetch(
      () => Promise.resolve(jsonResponse({ error: 'boom' }, 500)),
      () => Promise.resolve(jsonResponse(EUR_QUOTE)),
    )
    await expect(createFxApi(serverError).getFxRates()).rejects.toThrow()
  })
})
