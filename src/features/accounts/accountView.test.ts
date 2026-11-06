import { describe, expect, it } from 'vitest'
import type { AccountView } from './useAccounts'
import { toAccountCardView } from './accountView'

const NBSP = ' '
const MINUS = '−'

const PESOS: AccountView = {
  id: 'acc-1',
  name: 'Cuenta Pesos',
  currency: 'ARS',
  balance: 85500000,
  settled: 85500000,
  inProgress: 0,
  available: 85500000,
}

describe('toAccountCardView', () => {
  it('shows the available amount and no in-progress line when nothing is pending', () => {
    expect(toAccountCardView(PESOS, 'ready')).toEqual({
      id: 'acc-1',
      name: 'Cuenta Pesos',
      code: 'ARS',
      currencyName: 'Pesos argentinos',
      availability: { kind: 'known', label: `$${NBSP}855.000,00` },
      pendingLabel: undefined,
    })
  })

  it('shows in progress as a negative amount already taken from available', () => {
    const view = toAccountCardView({ ...PESOS, inProgress: 2000000, available: 83500000 }, 'ready')
    expect(view.availability).toEqual({ kind: 'known', label: `$${NBSP}835.000,00` })
    expect(view.pendingLabel).toBe(`${MINUS}$${NBSP}20.000,00`)
  })

  it('shows available as loading while pending transfers load', () => {
    const view = toAccountCardView({ ...PESOS, inProgress: 'unknown', available: 'unknown' }, 'loading')
    expect(view.availability).toEqual({ kind: 'loading' })
  })

  it('shows available as unknown when pending transfers failed', () => {
    const view = toAccountCardView({ ...PESOS, inProgress: 'unknown', available: 'unknown' }, 'error')
    expect(view.availability).toEqual({ kind: 'unknown' })
    expect(view.pendingLabel).toBeUndefined()
  })

  it('names each currency', () => {
    expect(toAccountCardView({ ...PESOS, currency: 'USD' }, 'ready').currencyName).toBe('Dólares estadounidenses')
    expect(toAccountCardView({ ...PESOS, currency: 'EUR' }, 'ready').currencyName).toBe('Euros')
  })
})
