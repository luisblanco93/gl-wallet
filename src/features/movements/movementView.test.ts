import { describe, expect, it } from 'vitest'
import type { Movement } from '@/domain/types'
import { toMovementRowView } from './movementView'

const NBSP = ' '
const MINUS = '−'
const OWN = [
  { id: 'acc-1', name: 'Cuenta Pesos' },
  { id: 'acc-5', name: 'Ahorro' },
]

const BASE: Movement = {
  id: 'txn-3',
  accountId: 'acc-1',
  type: 'expense',
  direction: null,
  amount: 5200000,
  currency: 'ARS',
  category: 'groceries',
  description: 'Compra semanal',
  status: 'completed',
  counterpartAccountId: null,
  createdAt: '2026-11-05T17:30:00Z',
}

describe('toMovementRowView', () => {
  it('shows an expense with its description, category, account, date and a negative amount', () => {
    expect(toMovementRowView(BASE, OWN)).toEqual({
      id: 'txn-3',
      title: 'Compra semanal',
      subtitle: 'Supermercado',
      category: 'groceries',
      accountLabel: 'Cuenta Pesos',
      dateLabel: '5 nov 2026, 14:30',
      amountLabel: `${MINUS}$${NBSP}52.000,00`,
      amountNote: undefined,
      tone: 'expense',
      status: 'completed',
      ariaLabel: `Compra semanal. menos $${NBSP}52.000,00. Completado. 5 nov 2026, 14:30.`,
    })
  })

  it('shows an income with a plus sign and the income tone', () => {
    const view = toMovementRowView({ ...BASE, type: 'income', category: 'salary', description: 'Sueldo octubre' }, OWN)
    expect(view.amountLabel).toBe(`+$${NBSP}52.000,00`)
    expect(view.tone).toBe('income')
    expect(view.ariaLabel).toContain(`más $${NBSP}52.000,00`)
  })

  it('uses the category label as title when there is no description', () => {
    const view = toMovementRowView({ ...BASE, description: '' }, OWN)
    expect(view.title).toBe('Supermercado')
  })

  it('labels an outgoing transfer to another user, with the description as subtitle', () => {
    const transfer: Movement = {
      ...BASE,
      type: 'transfer',
      direction: 'out',
      category: 'transfer',
      description: 'Pago compartido',
      status: 'pending',
      counterpartAccountId: 'acc-4',
      amount: 2000000,
    }
    const view = toMovementRowView(transfer, OWN)
    expect(view.title).toBe('Transferencia a acc-4')
    expect(view.subtitle).toBe('Pago compartido')
    expect(view.accountLabel).toBe('Cuenta Pesos → acc-4')
    expect(view.amountLabel).toBe(`${MINUS}$${NBSP}20.000,00`)
    expect(view.amountNote).toBe('Ya descontado del disponible')
    expect(view.status).toBe('pending')
  })

  it('labels the incoming side of an own-account transfer as its own row', () => {
    const incoming: Movement = {
      ...BASE,
      id: 'transfer-9-in',
      accountId: 'acc-5',
      type: 'transfer',
      direction: 'in',
      category: 'transfer',
      description: '',
      status: 'pending',
      counterpartAccountId: 'acc-1',
    }
    const view = toMovementRowView(incoming, OWN)
    expect(view.title).toBe('Transferencia desde Cuenta Pesos')
    expect(view.accountLabel).toBe('Cuenta Pesos → Ahorro')
    expect(view.amountLabel).toBe(`+$${NBSP}52.000,00`)
    expect(view.amountNote).toBe('Aún no acreditado')
    expect(view.subtitle).toBe('Transferencia')
  })

  it('carries the failed status', () => {
    expect(toMovementRowView({ ...BASE, status: 'failed' }, OWN).ariaLabel).toContain('Fallida')
  })
})
