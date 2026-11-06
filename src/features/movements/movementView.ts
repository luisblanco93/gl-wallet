import { categoryLabel } from '@/domain/categories'
import { formatDate } from '@/domain/dates'
import { formatSignedMoney, signedAmount } from '@/domain/money'
import { transferLabel } from '@/domain/transferLabel'
import type { Account, Movement, MovementStatus, MovementType } from '@/domain/types'

export type MovementRowView = {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly category: string
  readonly accountLabel: string
  readonly dateLabel: string
  readonly amountLabel: string
  readonly amountNote: string | undefined
  readonly tone: 'income' | 'expense'
  readonly status: MovementStatus
  readonly ariaLabel: string
}

export type OwnAccount = Pick<Account, 'id' | 'name'>

export const STATUS_LABELS: Readonly<Record<MovementStatus, string>> = {
  pending: 'Pendiente',
  completed: 'Completado',
  failed: 'Fallida',
}

export const TYPE_LABELS: Readonly<Record<MovementType, string>> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
}

/** The account's name when it is one of the user's accounts, otherwise its raw id. */
export function nameOf(accountId: string, ownAccounts: readonly OwnAccount[]): string {
  return ownAccounts.find((account) => account.id === accountId)?.name ?? accountId
}

/** "Origen → destino" for transfers, from the point of view of the money's path. */
function accountLabel(movement: Movement, ownAccounts: readonly OwnAccount[]): string {
  const own = nameOf(movement.accountId, ownAccounts)
  if (movement.type !== 'transfer' || movement.counterpartAccountId === null) return own
  const other = nameOf(movement.counterpartAccountId, ownAccounts)
  return movement.direction === 'in' ? `${other} → ${own}` : `${own} → ${other}`
}

function amountNote(movement: Movement, signed: number): string | undefined {
  if (movement.status !== 'pending') return undefined
  return signed < 0 ? 'Ya descontado del disponible' : 'Aún no acreditado'
}

/** Spoken amount: the minus and plus signs read as words. */
function spokenAmount(label: string): string {
  return label.replace('−', 'menos ').replace(/^\+/, 'más ')
}

/** Props for a movement row; transfers get "Transferencia a/desde …" and their path. */
export function toMovementRowView(movement: Movement, ownAccounts: readonly OwnAccount[]): MovementRowView {
  const signed = signedAmount(movement)
  const isTransfer = movement.type === 'transfer'
  const category = categoryLabel(movement.category)
  const title = isTransfer ? transferLabel(movement, ownAccounts) : movement.description || category
  const subtitle = isTransfer ? movement.description || category : category
  const amountLabel = formatSignedMoney(signed, movement.currency)
  const dateLabel = formatDate(movement.createdAt)
  const status = STATUS_LABELS[movement.status]

  return {
    id: movement.id,
    title,
    subtitle,
    category: movement.category,
    accountLabel: accountLabel(movement, ownAccounts),
    dateLabel,
    amountLabel,
    amountNote: amountNote(movement, signed),
    tone: signed > 0 ? 'income' : 'expense',
    status: movement.status,
    ariaLabel: `${title}. ${spokenAmount(amountLabel)}. ${status}. ${dateLabel}.`,
  }
}
