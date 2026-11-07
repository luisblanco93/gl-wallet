import type { KeyboardEvent, ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'
import type { Choice } from './SegmentedControl'

const tabId = (idPrefix: string, value: string) => `${idPrefix}-tab-${value}`
const panelId = (idPrefix: string, value: string) => `${idPrefix}-panel-${value}`

/** Tabs with roving tabindex and left/right arrows; `children` is the selected tab's panel. */
export function Tabs<T extends string>({
  idPrefix,
  label,
  items,
  value,
  onChange,
  children,
}: {
  idPrefix: string
  label: string
  items: readonly Choice<T>[]
  value: T
  onChange: (value: T) => void
  children: ReactNode
}) {
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const index = items.findIndex((item) => item.value === value)
    const step = event.key === 'ArrowRight' ? 1 : items.length - 1
    const next = items[(index + step) % items.length]
    if (next === undefined) return
    onChange(next.value)
    document.getElementById(tabId(idPrefix, next.value))?.focus()
  }

  return (
    <>
      <div role="tablist" aria-label={label} className="inline-flex gap-1 self-start rounded-pill bg-surface p-1">
        {items.map((item) => {
          const selected = item.value === value
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={tabId(idPrefix, item.value)}
              aria-selected={selected}
              // Only the selected tab's panel is rendered.
              aria-controls={selected ? panelId(idPrefix, item.value) : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              onKeyDown={handleKeyDown}
              className={cx(
                'inline-flex min-h-11 items-center gap-2 rounded-pill px-5 text-[0.9375rem]',
                selected ? 'bg-selected font-bold text-bg' : 'font-semibold text-ink hover:bg-ink/8',
              )}
            >
              {item.icon && <Icon as={item.icon} />}
              {item.label}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={panelId(idPrefix, value)} aria-labelledby={tabId(idPrefix, value)} className="flex flex-col gap-3">
        {children}
      </div>
    </>
  )
}
