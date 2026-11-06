import { Check, CircleAlert, CircleCheck, Clock, Inbox, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { cx } from './cx'
import { Icon } from './Icon'

export type AlertTone = 'info' | 'warning' | 'error' | 'success' | 'pending'

const ALERT_STYLES: Record<AlertTone, { className: string; icon: LucideIcon }> = {
  info: { className: 'bg-info-bg border-info-border text-ink [&>svg]:text-income', icon: Info },
  warning: { className: 'bg-warning-bg border-warning-border text-warning', icon: TriangleAlert },
  error: { className: 'bg-error-bg border-error-border text-error-strong', icon: CircleAlert },
  success: { className: 'bg-success-bg border-success-border text-success', icon: CircleCheck },
  pending: { className: 'bg-pending-bg border-pending-border border-dashed text-pending', icon: Clock },
}

export function Alert({
  tone,
  title,
  children,
  icon,
  role,
}: {
  tone: AlertTone
  title?: string
  children?: ReactNode
  icon?: LucideIcon
  role?: 'alert' | 'status' | 'note'
}) {
  const style = ALERT_STYLES[tone]
  return (
    <div
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
      className={cx('flex items-start gap-3 rounded-lg border-[1.5px] px-4 py-3.5', style.className)}
    >
      <Icon as={icon ?? style.icon} size={20} className="mt-px" />
      <div className="flex min-w-0 flex-col gap-0.5 text-sm/normal text-pretty">
        {title && <strong className="text-[0.906rem]">{title}</strong>}
        {children}
      </div>
    </div>
  )
}

type StateAction = { label: string; onClick: () => void; icon?: LucideIcon }

/** Empty state (`neutral`) or error state (`error`); `page` uses an h1 for full-page states. */
export function StateMessage({
  tone = 'neutral',
  icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  page,
}: {
  tone?: 'neutral' | 'error'
  icon?: LucideIcon
  title: string
  description: string
  page?: boolean
  action?: StateAction
  secondaryAction?: StateAction
}) {
  const Heading = page ? 'h1' : 'h2'
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="flex flex-col items-start gap-3.5 rounded-xl border-[1.5px] border-info-border bg-paper p-6 md:p-10"
    >
      <span
        className={cx(
          'grid size-13 place-items-center rounded-full',
          tone === 'error' ? 'bg-error-bg text-error-strong' : 'bg-neutral-200 text-ink',
        )}
      >
        <Icon as={icon} size={24} />
      </span>
      <div className="flex max-w-[52ch] flex-col gap-1.5">
        <Heading tabIndex={page ? -1 : undefined} className={page ? 'font-display text-display-sm' : 'text-title'}>
          {title}
        </Heading>
        <p className="text-body text-ink-soft text-pretty">{description}</p>
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap gap-2.5">
          {action && (
            <Button size="md" icon={action.icon} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="md" variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'block rounded-pill bg-[linear-gradient(90deg,#d8cab0,#e8dec9_45%,#d8cab0_90%)] bg-[length:220%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] motion-reduce:animate-none',
        className,
      )}
    />
  )
}

/** Loading container: announces the state and hides the skeletons from screen readers. */
export function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export type ToastMessage = { kind: 'success' | 'error'; title: string; description?: string }

export function Toast({ kind, title, description, onClose }: ToastMessage & { onClose: () => void }) {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full max-w-[26rem] items-start gap-3 rounded-[22px] bg-ink py-3.5 pl-4 pr-2.5 text-bg shadow-lg"
    >
      <span
        className={cx(
          'grid size-7 shrink-0 place-items-center rounded-full',
          kind === 'success' ? 'bg-[#ccdbb2] text-[#272e1b]' : 'bg-error-bg text-error-strong',
        )}
      >
        <Icon as={kind === 'success' ? Check : X} size={16} strokeWidth={3.25} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="text-[0.9375rem]">{title}</strong>
        {description && <span className="text-sm text-neutral-200 money-wrap">{description}</span>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-bg/16"
      >
        <Icon as={X} size={16} />
      </button>
    </div>
  )
}
