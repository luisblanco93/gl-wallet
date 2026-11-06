/** Categories accepted by the API, in its order. */
export const CATEGORY_IDS = [
  'salary',
  'freelance',
  'rent',
  'groceries',
  'transport',
  'entertainment',
  'utilities',
  'health',
  'transfer',
  'other',
] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

const LABELS: Readonly<Record<CategoryId, string>> = {
  salary: 'Sueldo',
  freelance: 'Freelance',
  rent: 'Alquiler',
  groceries: 'Supermercado',
  transport: 'Transporte',
  entertainment: 'Entretenimiento',
  utilities: 'Servicios',
  health: 'Salud',
  transfer: 'Transferencia',
  other: 'Otros',
}

/** `transfer` is set only by the API on transfer movements. */
export const selectableCategories: readonly CategoryId[] = CATEGORY_IDS.filter((id) => id !== 'transfer')

const INCOME_CATEGORIES: readonly CategoryId[] = ['salary', 'freelance', 'other']
const EXPENSE_CATEGORIES: readonly CategoryId[] = [
  'rent',
  'groceries',
  'transport',
  'entertainment',
  'utilities',
  'health',
  'other',
]

/** Categories offered when recording or editing a movement of this type; never `transfer`. */
export function categoriesFor(type: 'income' | 'expense'): readonly CategoryId[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

function isCategoryId(id: string): id is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(id)
}

/** Spanish label; an id the client does not know is shown as is. */
export function categoryLabel(id: string): string {
  return isCategoryId(id) ? LABELS[id] : id
}
