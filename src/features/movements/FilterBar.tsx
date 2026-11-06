import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { cx } from '@/shared/ui/cx'
import { SelectField } from '@/shared/ui/Field'
import { Icon } from '@/shared/ui/Icon'
import type { FilterChip, FilterKey, FilterOptions } from './filterView'

export type FilterValues = Readonly<Record<FilterKey, string>>

const SELECTS: readonly { key: FilterKey; label: string }[] = [
  { key: 'accountId', label: 'Cuenta' },
  { key: 'type', label: 'Tipo' },
  { key: 'category', label: 'Categoría' },
  { key: 'status', label: 'Estado' },
]

/** Search plus four selects; below `md` the selects fold behind "Filtros (n)". */
export function FilterBar({
  idPrefix,
  searchText,
  onSearchText,
  values,
  options,
  onChange,
  activeCount,
}: {
  idPrefix: string
  searchText: string
  onSearchText: (text: string) => void
  values: FilterValues
  options: FilterOptions
  onChange: (key: FilterKey, value: string) => void
  activeCount: number
}) {
  const [expanded, setExpanded] = useState(false)
  const filtersId = `${idPrefix}-filters`

  return (
    <div role="search" aria-label="Buscar y filtrar movimientos" className="flex flex-col gap-3.5">
      <div className="flex flex-col">
        <label htmlFor={`${idPrefix}-q`} className="mb-1.5 text-label">
          Buscar por descripción
        </label>
        <div className="relative">
          <Icon
            as={Search}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            id={`${idPrefix}-q`}
            type="search"
            value={searchText}
            onChange={(event) => onSearchText(event.target.value)}
            placeholder="Ej.: supermercado"
            autoComplete="off"
            maxLength={100}
            className="min-h-12 w-full rounded-pill border-[1.5px] border-line bg-surface pl-11 pr-12 text-input focus-visible:border-focus"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => onSearchText('')}
              aria-label="Borrar búsqueda"
              className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full hover:bg-ink/8"
            >
              <Icon as={X} size={16} />
            </button>
          )}
        </div>
      </div>
      <Button
        variant="secondary"
        size="md"
        icon={SlidersHorizontal}
        aria-expanded={expanded}
        aria-controls={filtersId}
        onClick={() => setExpanded((open) => !open)}
        className="self-start md:hidden"
      >
        {activeCount > 0 ? `Filtros (${activeCount})` : 'Filtros'}
      </Button>
      <div
        id={filtersId}
        className={cx(
          expanded ? 'grid' : 'hidden',
          'grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3 md:grid',
        )}
      >
        {SELECTS.map(({ key, label }) => (
          <SelectField
            key={key}
            id={`${idPrefix}-${key}`}
            label={label}
            value={values[key]}
            options={options[key]}
            onChange={(event) => onChange(key, event.target.value)}
          />
        ))}
      </div>
    </div>
  )
}

export function ActiveFilters({
  chips,
  onRemove,
  onClearAll,
}: {
  chips: readonly FilterChip[]
  onRemove: (key: FilterChip['key']) => void
  onClearAll: () => void
}) {
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-ink-muted">Filtros activos:</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove(chip.key)}
          aria-label={`Quitar filtro ${chip.label}`}
          className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-pill border-[1.5px] border-primary-accent bg-primary-tint py-1 pl-3.5 pr-2 text-sm font-semibold text-primary-active hover:bg-primary-accent/15"
        >
          <span className="truncate">{chip.label}</span>
          <Icon as={X} size={14} />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="min-h-8 px-2 text-sm font-bold text-link underline underline-offset-3"
      >
        Limpiar filtros
      </button>
    </div>
  )
}

/** "Mostrando 1–10 de 23" is announced when the filters or the page change. */
export function Pagination({
  from,
  to,
  total,
  page,
  pageCount,
  onPage,
}: {
  from: number
  to: number
  total: number
  page: number
  pageCount: number
  onPage: (page: number) => void
}) {
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3">
      <p aria-live="polite" className="text-sm font-semibold text-ink-soft money">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="md" icon={ChevronLeft} onClick={() => onPage(page - 1)} disabled={page <= 1}>
          Anterior
        </Button>
        <span className="whitespace-nowrap text-sm text-ink-muted money">
          Página {page} de {pageCount}
        </span>
        <Button
          variant="secondary"
          size="md"
          iconEnd={ChevronRight}
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  )
}
