import type { Movement } from './types'

export type EditableField = 'category' | 'description'
export type EditBlockReason = 'transferNotEditable'

const METADATA_FIELDS: readonly EditableField[] = ['category', 'description']

/** The API only lets incomes and expenses change their metadata; amounts never change. */
export function editableFields(movement: Pick<Movement, 'type'>): readonly EditableField[] {
  return movement.type === 'transfer' ? [] : METADATA_FIELDS
}

/** Why a movement cannot be edited at all, or `null` when it can. */
export function editBlockReason(movement: Pick<Movement, 'type'>): EditBlockReason | null {
  return movement.type === 'transfer' ? 'transferNotEditable' : null
}
