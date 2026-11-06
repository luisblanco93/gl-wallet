import type { Unknown } from './balances'
import type { Cents, Currency } from './types'

/**
 * Official reference rates in ARS per unit, for labelled estimates only: the platform never converts money.
 * `updatedAt` (ISO 8601) is the older of the two quotes, so the label never claims a fresher rate.
 */
export type FxRates = {
  readonly arsPerUsd: number
  readonly arsPerEur: number
  readonly updatedAt: string
}

/** The reference is the midpoint between the buy and sell quotes. */
export function referenceRate(compra: number, venta: number): number {
  return (compra + venta) / 2
}

function arsPerUnit(currency: Currency, rates: FxRates): number {
  switch (currency) {
    case 'ARS':
      return 1
    case 'USD':
      return rates.arsPerUsd
    case 'EUR':
      return rates.arsPerEur
  }
}

/** Estimated equivalent in cents, crossing through ARS and rounding once to the cent. */
export function convert(cents: Cents, from: Currency, to: Currency, rates: FxRates): Cents {
  if (from === to) return cents
  return Math.round((cents * arsPerUnit(from, rates)) / arsPerUnit(to, rates))
}

/** Sum of every account's available amount in ARS; unknown if any is unknown, so the total is hidden, never partial. */
export function estimatedTotalArs(
  accounts: readonly { readonly currency: Currency; readonly available: Cents | Unknown }[],
  rates: FxRates,
): Cents | Unknown {
  let total = 0
  for (const { currency, available } of accounts) {
    if (available === 'unknown') return 'unknown'
    total += convert(available, currency, 'ARS', rates)
  }
  return total
}
