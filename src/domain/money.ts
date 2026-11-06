import type { Cents, Currency, Movement } from './types'

export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }

export type AmountError = 'empty' | 'invalid' | 'tooManyDecimals' | 'belowMinimum' | 'tooLarge'

const CENTS_PER_UNIT = 100
const MAX_DECIMALS = 2
const MIN_AMOUNT: Cents = 1
/** Digits, optionally followed by one `,` or `.` and more digits. No sign, no thousands separators. */
const AMOUNT_PATTERN = /^(\d+)(?:[.,](\d+))?$/

/**
 * Parses user input into cents from its text, never through a float.
 * Thousands separators are not supported: `1.234` reads as 1 with 3 decimals and fails.
 */
export function parseAmount(input: string): Result<Cents, AmountError> {
  const text = input.trim()
  if (text === '') return { ok: false, error: 'empty' }

  const match = AMOUNT_PATTERN.exec(text)
  if (!match) return { ok: false, error: 'invalid' }

  const units = match[1] ?? ''
  const decimals = match[2] ?? ''
  if (decimals.length > MAX_DECIMALS) return { ok: false, error: 'tooManyDecimals' }

  const cents = Number(units) * CENTS_PER_UNIT + Number(decimals.padEnd(MAX_DECIMALS, '0'))
  if (!Number.isSafeInteger(cents)) return { ok: false, error: 'tooLarge' }
  if (cents < MIN_AMOUNT) return { ok: false, error: 'belowMinimum' }

  return { ok: true, value: cents }
}

/** API decimal → cents, rounded to the nearest cent. `toPrecision` drops binary noise (1.005 × 100 = 100.4999…). */
export function toCents(apiAmount: number): Cents {
  const cents = Math.round(Number((apiAmount * CENTS_PER_UNIT).toPrecision(15)))
  return cents === 0 ? 0 : cents
}

/** Cents → API decimal. Only for building request bodies. */
export function toApiAmount(cents: Cents): number {
  return cents / CENTS_PER_UNIT
}

const SYMBOLS: Readonly<Record<Currency, string>> = { ARS: '$', USD: 'US$', EUR: '€' }
/** Keeps the symbol and the number on the same line. */
const NBSP = ' '
const MINUS = '−'
const UNITS_FORMAT = new Intl.NumberFormat('es-AR', { useGrouping: 'always', maximumFractionDigits: 0 })

/**
 * es-AR money format with explicit symbols and minus sign: `Intl` currency style
 * prints `EUR` and an ASCII hyphen, and its output differs between engines.
 */
export function formatMoney(cents: Cents, currency: Currency): string {
  const absolute = Math.abs(cents)
  const units = UNITS_FORMAT.format(Math.trunc(absolute / CENTS_PER_UNIT))
  const decimals = String(absolute % CENTS_PER_UNIT).padStart(MAX_DECIMALS, '0')
  const sign = cents < 0 ? MINUS : ''
  return `${sign}${SYMBOLS[currency]}${NBSP}${units},${decimals}`
}

export type CurrencyTotal = { readonly currency: Currency; readonly total: Cents }

/** One total per currency, in order of first appearance. Amounts of different currencies are never added. */
export function totalsByCurrency(
  items: readonly { readonly amount: Cents; readonly currency: Currency }[],
): CurrencyTotal[] {
  return items.reduce<CurrencyTotal[]>((totals, item) => {
    const existing = totals.find((t) => t.currency === item.currency)
    if (!existing) return [...totals, { currency: item.currency, total: item.amount }]
    return totals.map((t) => (t === existing ? { ...t, total: t.total + item.amount } : t))
  }, [])
}

/** Amount with its effect on the account: expenses and outgoing transfers are negative. */
export function signedAmount(movement: Pick<Movement, 'type' | 'direction' | 'amount'>): Cents {
  const isDebit = movement.type === 'expense' || (movement.type === 'transfer' && movement.direction === 'out')
  return isDebit ? -movement.amount : movement.amount
}
