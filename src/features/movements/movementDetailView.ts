import { categoriesFor, categoryLabel } from '@/domain/categories'
import { editBlockReason } from '@/domain/editability'
import type { Movement } from '@/domain/types'
import { TYPE_LABELS, nameOf, toMovementRowView, type MovementRowView, type OwnAccount } from './movementView'

export type DetailFact = { readonly label: string; readonly value: string }

export type MovementDetailView = Pick<MovementRowView, 'title' | 'category' | 'amountLabel' | 'tone' | 'status'> & {
  readonly typeLabel: string
  readonly facts: readonly DetailFact[]
  /** Only incomes and expenses can change their category and description. */
  readonly editable: boolean
}

function transferFacts(movement: Movement, ownAccounts: readonly OwnAccount[]): DetailFact[] {
  if (movement.type !== 'transfer' || movement.counterpartAccountId === null) return []
  const counterpart = nameOf(movement.counterpartAccountId, ownAccounts)
  return [
    { label: movement.direction === 'in' ? 'Desde' : 'Para', value: counterpart },
    ...(movement.description ? [{ label: 'Descripción', value: movement.description }] : []),
    ...(movement.transferId ? [{ label: 'Comprobante', value: movement.transferId }] : []),
  ]
}

export function toMovementDetailView(movement: Movement, ownAccounts: readonly OwnAccount[]): MovementDetailView {
  const row = toMovementRowView(movement, ownAccounts)
  return {
    title: row.title,
    category: row.category,
    amountLabel: row.amountLabel,
    tone: row.tone,
    status: row.status,
    typeLabel: TYPE_LABELS[movement.type],
    facts: [
      { label: 'Cuenta', value: nameOf(movement.accountId, ownAccounts) },
      { label: 'Fecha', value: row.dateLabel },
      { label: 'Categoría', value: categoryLabel(movement.category) },
      ...transferFacts(movement, ownAccounts),
    ],
    editable: editBlockReason(movement) === null,
  }
}

/** Categories offered when editing: the type's list, plus the stored one so saving never changes it silently. */
export function editCategoryOptions(movement: Pick<Movement, 'type' | 'category'>): readonly { value: string; label: string }[] {
  if (movement.type === 'transfer') return []
  const offered: readonly string[] = categoriesFor(movement.type)
  const ids = offered.includes(movement.category) ? offered : [movement.category, ...offered]
  return ids.map((id) => ({ value: id, label: categoryLabel(id) }))
}
