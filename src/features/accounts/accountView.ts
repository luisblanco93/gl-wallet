import { formatMoney } from '@/domain/money'
import type { Currency } from '@/domain/types'
import type { AccountView, PendingStatus } from './useAccounts'

/** `known` shows the amount; `loading` a placeholder; `unknown` explains it and offers a retry. */
export type Availability = { readonly kind: 'known'; readonly label: string } | { readonly kind: 'loading' | 'unknown' }

export type AccountCardView = {
  readonly id: string
  readonly name: string
  readonly code: Currency
  readonly currencyName: string
  readonly availability: Availability
  /** "−$ 20.000,00" when outgoing transfers are in progress. */
  readonly pendingLabel: string | undefined
}

const CURRENCY_NAMES: Record<Currency, string> = {
  ARS: 'Pesos argentinos',
  USD: 'Dólares estadounidenses',
  EUR: 'Euros',
}

function availabilityOf(account: AccountView, pending: PendingStatus): Availability {
  if (account.available === 'unknown') return { kind: pending === 'error' ? 'unknown' : 'loading' }
  return { kind: 'known', label: formatMoney(account.available, account.currency) }
}

export function toAccountCardView(account: AccountView, pending: PendingStatus): AccountCardView {
  const inProgress = account.inProgress
  return {
    id: account.id,
    name: account.name,
    code: account.currency,
    currencyName: CURRENCY_NAMES[account.currency],
    availability: availabilityOf(account, pending),
    pendingLabel: inProgress !== 'unknown' && inProgress > 0 ? formatMoney(-inProgress, account.currency) : undefined,
  }
}
