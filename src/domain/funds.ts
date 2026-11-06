import type { Unknown } from './balances'
import type { Cents } from './types'

export type DebitCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'insufficient'; readonly available: Cents }
  | { readonly ok: false; readonly reason: 'unknownAvailable' }

/**
 * The single debit rule for expenses and transfers: `amount ≤ available`.
 * An unknown available blocks the debit; it is never treated as the full balance.
 */
export function canDebit(amount: Cents, available: Cents | Unknown): DebitCheck {
  if (available === 'unknown') return { ok: false, reason: 'unknownAvailable' }
  if (amount > available) return { ok: false, reason: 'insufficient', available }
  return { ok: true }
}
