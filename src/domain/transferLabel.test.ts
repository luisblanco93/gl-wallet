import { describe, expect, it } from 'vitest'
import { transferLabel } from './transferLabel'

const OWN_ACCOUNTS = [
  { id: 'acc-1', name: 'Cuenta Pesos' },
  { id: 'acc-5', name: 'Ahorro' },
]

describe('transferLabel', () => {
  it('names the own destination account on the outgoing row', () => {
    const row = { direction: 'out', counterpartAccountId: 'acc-5' } as const
    expect(transferLabel(row, OWN_ACCOUNTS)).toBe('Transferencia a Ahorro')
  })

  it('names the own source account on the incoming row', () => {
    const row = { direction: 'in', counterpartAccountId: 'acc-1' } as const
    expect(transferLabel(row, OWN_ACCOUNTS)).toBe('Transferencia desde Cuenta Pesos')
  })

  it('uses the raw account id for another user', () => {
    const outgoing = { direction: 'out', counterpartAccountId: 'acc-4' } as const
    const incoming = { direction: 'in', counterpartAccountId: 'acc-9' } as const
    expect(transferLabel(outgoing, OWN_ACCOUNTS)).toBe('Transferencia a acc-4')
    expect(transferLabel(incoming, OWN_ACCOUNTS)).toBe('Transferencia desde acc-9')
  })

  it('falls back to a plain label when the transfer data is missing', () => {
    expect(transferLabel({ direction: null, counterpartAccountId: null }, OWN_ACCOUNTS)).toBe(
      'Transferencia',
    )
  })
})
