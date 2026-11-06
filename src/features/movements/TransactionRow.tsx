import { cx } from '@/shared/ui/cx'
import { CategoryIcon } from '@/shared/ui/Icon'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { MovementRowView } from './movementView'

/** Desktop grid, aligned with `TransactionListHeader`. */
const ROW_GRID = 'grid-cols-[40px_minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_120px_minmax(150px,1fr)]'

/** A movement row; `compact` is the mobile and home layout. Opens the detail on click. */
export function TransactionRow({
  row,
  compact,
  onSelect,
}: {
  row: MovementRowView
  compact?: boolean
  onSelect: (id: string) => void
}) {
  const amount = (
    <span className={cx('text-amount money', row.tone === 'income' ? 'text-income' : 'text-expense')}>
      {row.amountLabel}
    </span>
  )

  if (compact) {
    return (
      <button
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

  return (
    <button
      type="button"
      onClick={() => onSelect(row.id)}
      aria-label={row.ariaLabel}
      aria-haspopup="dialog"
      className={cx('grid min-h-16 w-full items-center gap-x-4 rounded-lg px-4 py-2.5 text-left hover:bg-ink/5', ROW_GRID)}
    >
      <CategoryIcon category={row.category} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-semibold">{row.title}</span>
        <span className="truncate text-caption text-ink-muted">{row.subtitle}</span>
      </span>
      <span className="truncate text-sm text-ink-muted">{row.accountLabel}</span>
      <span className="text-sm text-ink-muted money">{row.dateLabel}</span>
      <span>
        <StatusBadge status={row.status} />
      </span>
      <span className="flex flex-col items-end text-right">
        {amount}
        {row.amountNote && <span className="text-xs text-ink-muted money">{row.amountNote}</span>}
      </span>
    </button>
  )
}

export function TransactionListHeader() {
  return (
    <div
      aria-hidden="true"
      className={cx(
        'grid gap-x-4 border-b border-line px-4 pb-2 pt-3 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted',
        ROW_GRID,
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
          <span className="size-10 rounded-full bg-[#d8cab0] motion-safe:animate-pulse" />
          <span className="flex flex-col gap-2">
            <span className="h-3.5 w-2/5 rounded-pill bg-[#d8cab0] motion-safe:animate-pulse" />
            <span className="h-3 w-1/4 rounded-pill bg-[#d8cab0] motion-safe:animate-pulse" />
          </span>
          <span className="h-4 w-24 rounded-pill bg-[#d8cab0] motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  )
}
