import { Check, Clock } from 'lucide-react'
import { cx } from '@/shared/ui/cx'
import { Icon } from '@/shared/ui/Icon'
import type { AccountCardView } from './accountView'

/** A selectable account (`role="radio"`) inside a labelled `radiogroup`, with its available. */
export function AccountOption({
  account,
  selected,
  onSelect,
  disabled,
}: {
  account: AccountCardView
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}) {
  const { availability } = account
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={cx(
        'flex min-h-18 w-full items-center gap-3.5 rounded-[24px] border-2 px-4.5 py-3.5 text-left disabled:opacity-45',
        selected ? 'border-primary-accent bg-primary-tint' : 'border-line bg-surface hover:border-neutral-600',
      )}
    >
      <span
        className={cx(
          'grid size-5.5 shrink-0 place-items-center rounded-full',
          selected ? 'bg-primary text-on-primary' : 'border-2 border-neutral-600',
        )}
      >
        {selected && <Icon as={Check} size={14} strokeWidth={3.25} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-bold">{account.name}</span>
        <span className="text-caption text-ink-muted">
          {account.code} · {account.currencyName}
        </span>
      </span>
      <span className="flex flex-col items-end text-right">
        <span className="text-caption text-ink-muted">Disponible</span>
        <span className="text-amount money">
          {availability.kind === 'known' ? availability.label : availability.kind === 'loading' ? 'Calculando…' : 'No disponible'}
        </span>
        {account.pendingLabel && (
          <span className="inline-flex items-center gap-1 text-caption text-pending money">
            <Icon as={Clock} size={12} />
            En proceso: {account.pendingLabel}
          </span>
        )}
      </span>
    </button>
  )
}
