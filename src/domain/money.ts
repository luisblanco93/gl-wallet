import type { Result } from './result'
import type { Cents, Currency, Movement } from './types'

export type AmountError = 'empty' | 'invalid' | 'tooManyDecimals' | 'belowMinimum' | 'tooLarge'

const CENTS_PER_UNIT = 100
const MAX_DECIMALS = 2
const MIN_AMOUNT: Cents = 1
/** es-AR thousands: dots grouping digits in threes, first group not starting with 0; optional `,` decimals. */
const GROUPED_PATTERN = /^([1-9]\d{0,2}(?:\.\d{3})+)(?:,(\d+))?$/
/** Digits, optionally followed by one `,` or `.` and more digits. */
const PLAIN_PATTERN = /^(\d+)(?:[.,](\d+))?$/

function splitAmount(text: string): { units: string; decimals: string } | null {
  const grouped = GROUPED_PATTERN.exec(text)
  if (grouped) return { units: (grouped[1] ?? '').replaceAll('.', ''), decimals: grouped[2] ?? '' }

  const plain = PLAIN_PATTERN.exec(text)
  if (plain) return { units: plain[1] ?? '', decimals: plain[2] ?? '' }

  return null
}

/**
 * Parses user input into cents from its text, never through a float.
 * es-AR convention: `1.234,56` and `1.500` use `.` for thousands; any other `.` is decimal (`1234.56`).
 */
export function parseAmount(input: string): Result<Cents, AmountError> {
  const text = input.trim()
  if (text === '') return { ok: false, error: 'empty' }

  const parts = splitAmount(text)
  if (!parts) return { ok: false, error: 'invalid' }

  const { units, decimals } = parts
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
  const sign = cents < 0 ? MINUS : ''
  return `${sign}${SYMBOLS[currency]}${NBSP}${formatAmountInput(Math.abs(cents))}`
}

/** A positive amount as the user types it (`20.000,00`), e.g. to tidy the field on blur. */
export function formatAmountInput(cents: Cents): string {
  const units = UNITS_FORMAT.format(Math.trunc(cents / CENTS_PER_UNIT))
  const decimals = String(cents % CENTS_PER_UNIT).padStart(MAX_DECIMALS, '0')
  return `${units},${decimals}`
}

/** The currency symbol shown inside amount fields. */
export function currencySymbol(currency: Currency): string {
  return SYMBOLS[currency]
}

/** Like `formatMoney`, with `+` before positive amounts (incomes). */
export function formatSignedMoney(cents: Cents, currency: Currency): string {
  const formatted = formatMoney(cents, currency)
  return cents > 0 ? `+${formatted}` : formatted
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
