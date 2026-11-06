import type { LucideIcon } from 'lucide-react'
import { cx } from './cx'
import { Icon } from './Icon'

export type Choice<T extends string> = { readonly value: T; readonly label: string; readonly icon?: LucideIcon }

/** Exclusive choice (radiogroup), e.g. Ingreso / Gasto. */
export function SegmentedControl<T extends string>({
  label,
  items,
  value,
  onChange,
  disabled,
}: {
  label: string
  items: readonly Choice<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1 self-start rounded-pill bg-surface p-1">
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(item.value)}
            className={cx(
              'inline-flex min-h-11 items-center gap-2 rounded-pill px-5 text-[0.9375rem] disabled:opacity-45',
              selected ? 'bg-selected font-bold text-bg' : 'font-semibold text-ink hover:bg-ink/8',
            )}
          >
            {item.icon && <Icon as={item.icon} />}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
