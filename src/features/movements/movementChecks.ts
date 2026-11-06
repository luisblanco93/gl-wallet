import type { MovementEdit, NewMovement } from '@/api/endpoints'
import { selectableCategories } from '@/domain/categories'
import { editBlockReason } from '@/domain/editability'
import { canDebit } from '@/domain/funds'
import type { Cents, Movement } from '@/domain/types'

export const MAX_DESCRIPTION_LENGTH = 500

export type MovementProblem =
  | 'invalidAmount'
  | 'invalidCategory'
  | 'descriptionTooLong'
  | 'unknownAvailable'
  | 'transferNotEditable'

export type MovementCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly problem: 'insufficient'; readonly available: Cents }
  | { readonly ok: false; readonly problem: MovementProblem }

function isSelectable(category: string): boolean {
  return (selectableCategories as readonly string[]).includes(category)
}

function checkMetadata(category: string, description: string): MovementCheck {
  if (!isSelectable(category)) return { ok: false, problem: 'invalidCategory' }
  if (description.length > MAX_DESCRIPTION_LENGTH) return { ok: false, problem: 'descriptionTooLong' }
  return { ok: true }
}

/** Last check before `POST /transactions`: an expense must pass the debit rule; an income never does. */
export function checkNewMovement(movement: NewMovement, available: Cents | 'unknown'): MovementCheck {
  if (!Number.isInteger(movement.amount) || movement.amount < 1) return { ok: false, problem: 'invalidAmount' }
  const metadata = checkMetadata(movement.category, movement.description)
  if (!metadata.ok || movement.type === 'income') return metadata

  const debit = canDebit(movement.amount, available)
  if (debit.ok) return { ok: true }
  return debit.reason === 'insufficient'
    ? { ok: false, problem: 'insufficient', available: debit.available }
    : { ok: false, problem: 'unknownAvailable' }
}

/** Last check before `PATCH /transactions/:id`: only incomes and expenses, only their metadata. */
export function checkMovementEdit(movement: Movement, edit: MovementEdit): MovementCheck {
  if (editBlockReason(movement) !== null) return { ok: false, problem: 'transferNotEditable' }
  return checkMetadata(edit.category, edit.description)
}
