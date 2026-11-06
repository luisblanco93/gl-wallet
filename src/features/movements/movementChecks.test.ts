import { describe, expect, it } from 'vitest'
import type { NewMovement } from '@/api/endpoints'
import { MAX_DESCRIPTION_LENGTH, type Movement } from '@/domain/types'
import { checkMovementEdit, checkNewMovement } from './movementChecks'

const EXPENSE: NewMovement = {
  accountId: 'acc-2',
  type: 'expense',
  amount: 100000,
  category: 'groceries',
  description: 'Supermercado',
}

const STORED: Movement = {
  id: 'txn-5',
  accountId: 'acc-1',
  type: 'expense',
  direction: null,
  amount: 500000,
  currency: 'ARS',
  category: 'groceries',
  description: 'Supermercado',
  status: 'completed',
  counterpartAccountId: null,
  transferId: null,
  createdAt: '2026-11-01T10:00:00.000Z',
}

describe('checkNewMovement', () => {
  it('accepts an expense within available', () => {
    expect(checkNewMovement(EXPENSE, 44000 * 10)).toEqual({ ok: true })
  })

  it('rejects an expense above available, reporting the available amount', () => {
    expect(checkNewMovement(EXPENSE, 44000)).toEqual({ ok: false, problem: 'insufficient', available: 44000 })
  })

  it('rejects an expense while available is unknown', () => {
    expect(checkNewMovement(EXPENSE, 'unknown')).toEqual({ ok: false, problem: 'unknownAvailable' })
  })

  it('never applies the debit rule to an income', () => {
    expect(checkNewMovement({ ...EXPENSE, type: 'income', category: 'salary', amount: 999999999 }, 'unknown')).toEqual({ ok: true })
  })

  it('rejects the transfer category and unknown categories', () => {
    expect(checkNewMovement({ ...EXPENSE, category: 'transfer' }, 'unknown')).toEqual({
      ok: false,
      problem: 'invalidCategory',
    })
    expect(checkNewMovement({ ...EXPENSE, type: 'income', category: 'crypto' }, 0)).toEqual({
      ok: false,
      problem: 'invalidCategory',
    })
  })

  it('only accepts the categories offered for the type', () => {
    expect(checkNewMovement({ ...EXPENSE, category: 'salary' }, 44000 * 10)).toEqual({
      ok: false,
      problem: 'invalidCategory',
    })
    expect(checkNewMovement({ ...EXPENSE, type: 'income', category: 'groceries' }, 0)).toEqual({
      ok: false,
      problem: 'invalidCategory',
    })
  })

  it(`accepts a description of ${MAX_DESCRIPTION_LENGTH} characters and rejects a longer one`, () => {
    const income = { ...EXPENSE, type: 'income' as const, category: 'salary' }
    expect(checkNewMovement({ ...income, description: 'x'.repeat(MAX_DESCRIPTION_LENGTH) }, 0)).toEqual({ ok: true })
    expect(checkNewMovement({ ...income, description: 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1) }, 0)).toEqual({
      ok: false,
      problem: 'descriptionTooLong',
    })
  })

  it('rejects an amount that is not a positive whole number of cents', () => {
    expect(checkNewMovement({ ...EXPENSE, type: 'income', category: 'salary', amount: 0 }, 0)).toEqual({ ok: false, problem: 'invalidAmount' })
    expect(checkNewMovement({ ...EXPENSE, type: 'income', category: 'salary', amount: 10.5 }, 0)).toEqual({
      ok: false,
      problem: 'invalidAmount',
    })
  })
})

describe('checkMovementEdit', () => {
  it('accepts a new category and description for an expense', () => {
    expect(checkMovementEdit(STORED, { category: 'other', description: 'Compra' })).toEqual({ ok: true })
  })

  it('rejects any edit of a transfer', () => {
    const transfer = { ...STORED, type: 'transfer' as const, direction: 'out' as const, category: 'transfer' }
    expect(checkMovementEdit(transfer, { category: 'other', description: '' })).toEqual({
      ok: false,
      problem: 'transferNotEditable',
    })
  })

  it('rejects a category of the other type, but keeps the stored one', () => {
    expect(checkMovementEdit(STORED, { category: 'salary', description: '' })).toEqual({
      ok: false,
      problem: 'invalidCategory',
    })
    const legacy = { ...STORED, category: 'freelance' }
    expect(checkMovementEdit(legacy, { category: 'freelance', description: 'Otro texto' })).toEqual({ ok: true })
  })

  it('rejects the transfer category and a description that is too long', () => {
    expect(checkMovementEdit(STORED, { category: 'transfer', description: '' })).toEqual({
      ok: false,
      problem: 'invalidCategory',
    })
    expect(checkMovementEdit(STORED, { category: 'other', description: 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1) })).toEqual({
      ok: false,
      problem: 'descriptionTooLong',
    })
  })
})
