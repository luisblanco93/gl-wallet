import { describe, expect, it } from 'vitest'
import { accountFigures } from './balances'
import { ownDestinationOptions, validateTransfer, type TransferAccount, type TransferInput } from './transferForm'
import { MAX_DESCRIPTION_LENGTH, type Movement } from './types'

const pesos: TransferAccount = { id: 'acc-1', name: 'Cuenta Pesos', currency: 'ARS', available: 85_500_000 }
const dolares: TransferAccount = { id: 'acc-2', name: 'Cuenta Dólares', currency: 'USD', available: 44_000 }
const ahorro: TransferAccount = { id: 'acc-5', name: 'Ahorro', currency: 'ARS', available: 0 }
const accounts = [pesos, dolares, ahorro]

/** Valid own transfer; each test breaks one field. */
const valid: TransferInput = {
  sourceId: 'acc-1',
  destination: { kind: 'own', accountId: 'acc-5' },
  amountText: '1.500,50',
  description: ' Alquiler ',
}

describe('ownDestinationOptions', () => {
  it('excludes the source and disables accounts in another currency', () => {
    expect(ownDestinationOptions(pesos, accounts)).toEqual([
      { account: dolares, check: { ok: false, reason: 'currencyMismatch', from: 'ARS', to: 'USD' } },
      { account: ahorro, check: { ok: true } },
    ])
  })
})

describe('validateTransfer', () => {
  it('accepts an own transfer in cents with a trimmed description', () => {
    expect(validateTransfer(valid, accounts)).toEqual({
      ok: true,
      value: { source: pesos, destination: { kind: 'own', account: ahorro }, amount: 150_050, description: 'Alquiler' },
    })
  })

  it('accepts a P2P transfer to a trimmed account id', () => {
    const result = validateTransfer({ ...valid, destination: { kind: 'p2p', accountId: '  acc-4 ' } }, accounts)
    expect(result.ok && result.value.destination).toEqual({ kind: 'p2p', accountId: 'acc-4' })
  })

  it('rejects an empty, blank or source P2P id', () => {
    for (const accountId of ['', '   ']) {
      expect(validateTransfer({ ...valid, destination: { kind: 'p2p', accountId } }, accounts)).toEqual({
        ok: false,
        error: { destination: { reason: 'required' } },
      })
    }
    expect(validateTransfer({ ...valid, destination: { kind: 'p2p', accountId: 'acc-1' } }, accounts)).toEqual({
      ok: false,
      error: { destination: { reason: 'sameAsSource' } },
    })
  })

  it('applies the own-account rules to a P2P id of an own account', () => {
    expect(validateTransfer({ ...valid, destination: { kind: 'p2p', accountId: ' acc-2' } }, accounts)).toEqual({
      ok: false,
      error: { destination: { reason: 'currencyMismatch', from: 'ARS', to: 'USD' } },
    })
    const sameCurrency = validateTransfer({ ...valid, destination: { kind: 'p2p', accountId: 'acc-5' } }, accounts)
    expect(sameCurrency.ok && sameCurrency.value.destination).toEqual({ kind: 'own', account: ahorro })
  })

  it('rejects an amount above the available, naming the available', () => {
    expect(validateTransfer({ ...valid, amountText: '900.000' }, accounts)).toEqual({
      ok: false,
      error: { amount: { reason: 'insufficient', available: 85_500_000 } },
    })
  })

  it('measures the amount against an available reduced by a pending transfer', () => {
    const pendingTransfer: Movement = {
      id: 'transfer-1-out',
      accountId: 'acc-1',
      type: 'transfer',
      direction: 'out',
      amount: 50_000_000,
      currency: 'ARS',
      category: 'transfer',
      status: 'pending',
      counterpartAccountId: 'acc-4',
      transferId: 'transfer-1',
      description: '',
      createdAt: '2026-11-06T15:00:00.000Z',
    }
    const { available } = accountFigures({ id: 'acc-1', balance: 72_000_000 }, [pendingTransfer])
    const source = { ...pesos, available }

    expect(validateTransfer({ ...valid, amountText: '500.000' }, [source, ahorro])).toEqual({
      ok: false,
      error: { amount: { reason: 'insufficient', available: 22_000_000 } },
    })
  })

  it('blocks the transfer while the available is unknown', () => {
    expect(validateTransfer(valid, [{ ...pesos, available: 'unknown' }, ahorro])).toEqual({
      ok: false,
      error: { amount: { reason: 'unknownAvailable' } },
    })
  })

  it('rejects a description above the API limit', () => {
    expect(validateTransfer({ ...valid, description: 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1) }, accounts)).toEqual({
      ok: false,
      error: { description: { reason: 'tooLong', max: MAX_DESCRIPTION_LENGTH } },
    })
  })
})
