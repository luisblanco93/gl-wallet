import type { MovementEdit, NewMovement } from '@/api/endpoints'
import { categoriesFor } from '@/domain/categories'
import { editBlockReason } from '@/domain/editability'
import { canDebit } from '@/domain/funds'
import { MAX_DESCRIPTION_LENGTH, type Cents, type Movement } from '@/domain/types'

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

/** Offered for the type, or the category the movement already has (editing must not change it silently). */
function isAllowedCategory(type: 'income' | 'expense', category: string, stored?: string): boolean {
  return category === stored || (categoriesFor(type) as readonly string[]).includes(category)
}

function checkMetadata(categoryAllowed: boolean, description: string): MovementCheck {
  if (!categoryAllowed) return { ok: false, problem: 'invalidCategory' }
  if (description.length > MAX_DESCRIPTION_LENGTH) return { ok: false, problem: 'descriptionTooLong' }
  return { ok: true }
}

/** Last check before `POST /transactions`: an expense must pass the debit rule; an income never does. */
export function checkNewMovement(movement: NewMovement, available: Cents | 'unknown'): MovementCheck {
  if (!Number.isInteger(movement.amount) || movement.amount < 1) return { ok: false, problem: 'invalidAmount' }
  const metadata = checkMetadata(isAllowedCategory(movement.type, movement.category), movement.description)
  if (!metadata.ok || movement.type === 'income') return metadata

  const debit = canDebit(movement.amount, available)
  if (debit.ok) return { ok: true }
  return debit.reason === 'insufficient'
    ? { ok: false, problem: 'insufficient', available: debit.available }
    : { ok: false, problem: 'unknownAvailable' }
}

/** Last check before `PATCH /transactions/:id`: only incomes and expenses, only their metadata. */
export function checkMovementEdit(movement: Movement, edit: MovementEdit): MovementCheck {
  if (movement.type === 'transfer' || editBlockReason(movement) !== null) return { ok: false, problem: 'transferNotEditable' }
  return checkMetadata(isAllowedCategory(movement.type, edit.category, movement.category), edit.description)
}
