import type { Account, Currency } from './types'

export type CurrencyCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'currencyMismatch'; readonly from: Currency; readonly to: Currency }

/**
 * The API credits the same number on both sides without converting, so a transfer
 * between currencies would create or destroy value: it is blocked (DECISIONS.md §1).
 */
export function canTransferBetween(
  source: Pick<Account, 'currency'>,
  destination: Pick<Account, 'currency'>,
): CurrencyCheck {
  if (source.currency === destination.currency) return { ok: true }
  return { ok: false, reason: 'currencyMismatch', from: source.currency, to: destination.currency }
}
