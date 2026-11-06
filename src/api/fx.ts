import { referenceRate, type FxRates } from '@/domain/fx'
import { networkError, toApiError, untrustworthyResponse } from './errors'

/** Public source with no auth (transfers design.md, "FX source"); separate from the wallet API on purpose. */
export const FX_BASE_URL = 'https://dolarapi.com/v1'
const USD_PATH = '/dolares/oficial'
const EUR_PATH = '/cotizaciones/eur'

type Quote = { readonly rate: number; readonly updatedAtMs: number }

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** `{ compra, venta, fechaActualizacion }`; anything else makes the whole estimate unavailable. */
function parseQuote(body: unknown, path: string): Quote {
  const quote = typeof body === 'object' && body !== null ? (body as Readonly<Record<string, unknown>>) : {}
  const { compra, venta, fechaActualizacion } = quote
  const updatedAtMs = typeof fechaActualizacion === 'string' ? Date.parse(fechaActualizacion) : Number.NaN
  if (!isPositiveNumber(compra) || !isPositiveNumber(venta) || Number.isNaN(updatedAtMs)) {
    throw untrustworthyResponse(`Unexpected FX data: ${path}`)
  }
  return { rate: referenceRate(compra, venta), updatedAtMs }
}

/** No custom headers: a plain GET needs no CORS preflight (dolarapi answers preflights with 405). */
async function fetchQuote(fetch: typeof globalThis.fetch, path: string): Promise<Quote> {
  let response: Response
  try {
    response = await fetch(`${FX_BASE_URL}${path}`)
  } catch {
    throw networkError()
  }
  if (!response.ok) throw toApiError(response.status, undefined)

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw untrustworthyResponse(`FX ${path}: expected a JSON body`)
  }
  return parseQuote(body, path)
}

export function createFxApi(fetch: typeof globalThis.fetch) {
  return {
    /** Both official quotes or an error: estimates never use a partial set of rates. */
    async getFxRates(): Promise<FxRates> {
      const [usd, eur] = await Promise.all([fetchQuote(fetch, USD_PATH), fetchQuote(fetch, EUR_PATH)])
      return {
        arsPerUsd: usd.rate,
        arsPerEur: eur.rate,
        updatedAt: new Date(Math.min(usd.updatedAtMs, eur.updatedAtMs)).toISOString(),
      }
    },
  }
}

export type FxApi = ReturnType<typeof createFxApi>
