import { CATEGORY_IDS, categoryLabel } from '@/domain/categories'
import { MOVEMENT_STATUSES, MOVEMENT_TYPES } from '@/domain/types'
import type { FilterKey, MovementListState } from './filters'
import { STATUS_LABELS, TYPE_LABELS, nameOf, type OwnAccount } from './movementView'

export type { FilterKey }
export type FilterOption = { readonly value: string; readonly label: string }
export type FilterOptions = Readonly<Record<FilterKey, readonly FilterOption[]>>
export type FilterChip = { readonly key: FilterKey | 'search'; readonly label: string }

/** The empty value of every select: no filter. */
export const ALL = ''

/** Select options; an account in the URL that is not (yet) in the list keeps its id as label. */
export function filterOptions(state: MovementListState, ownAccounts: readonly OwnAccount[]): FilterOptions {
  const accounts = ownAccounts.map((account) => ({ value: account.id, label: account.name }))
  const { accountId } = state
  const unknownAccount =
    accountId !== undefined && !accounts.some((option) => option.value === accountId)
      ? [{ value: accountId, label: accountId }]
      : []
  return {
    accountId: [{ value: ALL, label: 'Todas' }, ...accounts, ...unknownAccount],
    type: [{ value: ALL, label: 'Todos' }, ...MOVEMENT_TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] }))],
    category: [{ value: ALL, label: 'Todas' }, ...CATEGORY_IDS.map((id) => ({ value: id, label: categoryLabel(id) }))],
    status: [
      { value: ALL, label: 'Todos' },
      ...MOVEMENT_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
    ],
  }
}

/** One chip per active filter, in the order of the filter bar. */
export function activeFilterChips(state: MovementListState, ownAccounts: readonly OwnAccount[]): readonly FilterChip[] {
  const { search, accountId, type, category, status } = state
  return [
    search !== undefined && { key: 'search', label: `Búsqueda: “${search}”` },
    accountId !== undefined && { key: 'accountId', label: `Cuenta: ${nameOf(accountId, ownAccounts)}` },
    type !== undefined && { key: 'type', label: `Tipo: ${TYPE_LABELS[type]}` },
    category !== undefined && { key: 'category', label: `Categoría: ${categoryLabel(category)}` },
    status !== undefined && { key: 'status', label: `Estado: ${STATUS_LABELS[status]}` },
  ].filter((chip): chip is FilterChip => chip !== false)
}
