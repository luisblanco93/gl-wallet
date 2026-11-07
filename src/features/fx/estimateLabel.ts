import { formatDate } from '@/domain/dates'
import { convert, type FxRates } from '@/domain/fx'
import { formatMoney } from '@/domain/money'
import type { Cents, Currency } from '@/domain/types'

/** "estimado al tipo de cambio oficial (5 nov 2026, 14:49)": every estimate carries it. */
export function rateLabel(rates: FxRates): string {
  return `estimado al tipo de cambio oficial (${formatDate(rates.updatedAt)})`
}

/** "$ 100.000,00 ≈ US$ 64,72, estimado al tipo de cambio oficial (…)": never an amount to be credited. */
export function estimateLabel(amount: Cents, from: Currency, to: Currency, rates: FxRates): string {
  const estimate = formatMoney(convert(amount, from, to, rates), to)
  return `${formatMoney(amount, from)} ≈ ${estimate}, ${rateLabel(rates)}`
}
