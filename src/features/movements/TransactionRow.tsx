import type { Ref } from 'react'
import { cx } from '@/shared/ui/cx'
import { CategoryIcon } from '@/shared/ui/Icon'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { MovementRowView } from './movementView'

/** Desktop grid, aligned with `TransactionListHeader`. */
const MD_ROW_GRID = 'md:grid-cols-[40px_minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_120px_minmax(150px,1fr)]'

/**
 * A movement row that opens the detail on click. `compact` keeps the mobile layout at every
 * width (home); otherwise the row switches to the column grid from `md` up.
 */
export function TransactionRow({
  row,
  compact,
  onSelect,
  ref,
}: {
  row: MovementRowView
  compact?: boolean
  onSelect: (id: string) => void
  ref?: Ref<HTMLButtonElement>
}) {
  const amount = (
    <span className={cx('text-amount money', row.tone === 'income' ? 'text-income' : 'text-expense')}>
      {row.amountLabel}
    </span>
  )

  if (compact) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onSelect(row.id)}
        aria-label={row.ariaLabel}
        aria-haspopup="dialog"
        className="grid min-h-17 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-ink/5"
      >
        <CategoryIcon category={row.category} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-semibold">{row.title}</span>
          <span className="truncate text-caption text-ink-muted">{row.accountLabel}</span>
          <span className="text-xs text-ink-muted money">{row.dateLabel}</span>
        </span>
        <span className="flex flex-col items-end gap-1.5">
          {amount}
          <StatusBadge status={row.status} />
        </span>
      </button>
    )
  }

  // One button for both layouts: compact below `md`, the six-column grid from `md` up.
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(row.id)}
      aria-label={row.ariaLabel}
      aria-haspopup="dialog"
      className={cx(
        'grid min-h-17 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-ink/5 md:min-h-16 md:gap-x-4 md:px-4',
        MD_ROW_GRID,
      )}
    >
      <CategoryIcon category={row.category} />
      <span className="flex min-w-0 flex-col gap-0.5 md:gap-0">
        <span className="truncate font-semibold">{row.title}</span>
        <span className="hidden truncate text-caption text-ink-muted md:block">{row.subtitle}</span>
        <span className="truncate text-caption text-ink-muted md:hidden">{row.accountLabel}</span>
        <span className="text-xs text-ink-muted money md:hidden">{row.dateLabel}</span>
      </span>
      <span className="hidden truncate text-sm text-ink-muted md:block">{row.accountLabel}</span>
      <span className="hidden text-sm text-ink-muted money md:block">{row.dateLabel}</span>
      <span className="hidden md:block">
        <StatusBadge status={row.status} />
      </span>
      <span className="flex flex-col items-end gap-1.5 text-right md:gap-0">
        {amount}
        {row.amountNote && <span className="hidden text-xs text-ink-muted money md:block">{row.amountNote}</span>}
        <span className="md:hidden">
          <StatusBadge status={row.status} />
        </span>
      </span>
    </button>
  )
}

export function TransactionListHeader() {
  return (
    <div
      aria-hidden="true"
      className={cx(
        'hidden gap-x-4 border-b border-line px-4 pb-2 pt-3 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted md:grid',
        MD_ROW_GRID,
      )}
    >
      <span />
      <span>Descripción</span>
      <span>Cuenta</span>
      <span>Fecha</span>
      <span>Estado</span>
      <span className="text-right">Monto</span>
    </div>
  )
}

export function TransactionRowSkeletonList({ rows = 8, label = 'Cargando movimientos…' }: { rows?: number; label?: string }) {
  return (
    <div aria-busy="true" className="rounded-xl bg-paper p-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden="true" className="grid grid-cols-[40px_1fr_auto] items-center gap-3.5 px-2.5 py-3">
          <span className="size-10 rounded-full bg-neutral-300 motion-safe:animate-pulse" />
          <span className="flex flex-col gap-2">
            <span className="h-3.5 w-2/5 rounded-pill bg-neutral-300 motion-safe:animate-pulse" />
            <span className="h-3 w-1/4 rounded-pill bg-neutral-300 motion-safe:animate-pulse" />
          </span>
          <span className="h-4 w-24 rounded-pill bg-neutral-300 motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  )
}
