import { CircleAlert, CircleCheck, Clock, type LucideIcon } from 'lucide-react'
import { cx } from './cx'
import { Icon } from './Icon'

export type BadgeStatus = 'pending' | 'completed' | 'failed'

const BADGES: Record<BadgeStatus, { label: string; icon: LucideIcon; className: string }> = {
  pending: { label: 'Pendiente', icon: Clock, className: 'border-dashed border-pending-border bg-pending-bg text-pending' },
  completed: { label: 'Completado', icon: CircleCheck, className: 'border-success-border bg-success-bg text-success' },
  /** Not drawn in the handoff: built from the error tokens. */
  failed: { label: 'Fallida', icon: CircleAlert, className: 'border-error-border bg-error-bg text-error-strong' },
}

/** Status with icon, text and shape (dashed = not finished); never color alone. */
export function StatusBadge({ status, label }: { status: BadgeStatus; label?: string }) {
  const badge = BADGES[status]
  return (
    <span
      className={cx(
        'inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-pill border-[1.5px] py-0.5 pl-1.5 pr-2.5 text-[0.78rem] font-semibold leading-tight',
        badge.className,
      )}
    >
      <Icon as={badge.icon} size={14} />
      {label ?? badge.label}
    </span>
  )
}
