import { ChevronDown, CircleAlert, CircleCheck, Eye, EyeOff, Lock } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

const CONTROL =
  'w-full rounded-pill border-[1.5px] bg-surface text-input text-ink placeholder:text-ink-muted hover:border-ink/45 focus-visible:border-focus focus-visible:outline-offset-0 disabled:opacity-60'
const borderFor = (error?: string) => (error ? 'border-error' : 'border-line')

export function FieldMessage({ id, tone, children }: { id: string; tone: 'error' | 'success' | 'help'; children: ReactNode }) {
  if (tone === 'help') {
    return (
      <p id={id} className="mt-1.5 text-label font-normal text-ink-soft money-wrap">
        {children}
      </p>
    )
  }
  return (
    <p
      id={id}
      className={cx(
        'mt-1.5 flex items-start gap-1.5 text-[0.84rem] font-semibold',
        tone === 'error' ? 'text-error' : 'text-available',
      )}
    >
      <Icon as={tone === 'error' ? CircleAlert : CircleCheck} size={16} className="mt-px" />
      {children}
    </p>
  )
}

type BaseFieldProps = { id: string; label: ReactNode; error?: string; help?: ReactNode }
type InputRef = { ref?: Ref<HTMLInputElement> }

function describedBy(id: string, error?: string, help?: ReactNode): string | undefined {
  return [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
}

export function TextField({
  id,
  label,
  error,
  help,
  className,
  ref,
  ...input
}: BaseFieldProps & InputRef & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cx('flex flex-col', className)}>
      <label htmlFor={id} className="mb-1.5 text-label">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, help)}
        className={cx(CONTROL, borderFor(error), 'min-h-12 px-4.5')}
        {...input}
      />
      {help && (
        <FieldMessage id={`${id}-help`} tone="help">
          {help}
        </FieldMessage>
      )}
      {error && (
        <FieldMessage id={`${id}-error`} tone="error">
          {error}
        </FieldMessage>
      )}
    </div>
  )
}

export function PasswordField({
  id,
  label,
  error,
  visible,
  onToggleVisible,
  ref,
  ...input
}: BaseFieldProps & InputRef & InputHTMLAttributes<HTMLInputElement> & { visible: boolean; onToggleVisible: () => void }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 text-label">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cx(CONTROL, borderFor(error), 'min-h-12 pl-4.5 pr-14')}
          {...input}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          disabled={input.disabled}
          className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full hover:bg-ink/8"
        >
          <Icon as={visible ? EyeOff : Eye} />
        </button>
      </div>
      {error && (
        <FieldMessage id={`${id}-error`} tone="error">
          {error}
        </FieldMessage>
      )}
    </div>
  )
}

export type MoneyInputProps = BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
    /** `$`, `US$` or `€`. */
    symbol: string
    /** e.g. "Disponible en Cuenta Pesos: $ 855.000,00". */
    availableLabel?: ReactNode
    /** Live positive feedback (aria-live), e.g. "Te quedarán …". */
    okMessage?: string
  }

export function MoneyInput({ id, label, error, okMessage, availableLabel, symbol, className, ...input }: MoneyInputProps) {
  return (
    <div className={cx('flex flex-col', className)}>
      <label htmlFor={id} className="mb-1.5 text-label">
        {label}
      </label>
      <div className="relative max-w-[26rem]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold text-ink-muted"
        >
          {symbol}
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          aria-invalid={!!error}
          aria-describedby={[availableLabel ? `${id}-help` : null, `${id}-live`].filter(Boolean).join(' ')}
          className={cx(CONTROL, borderFor(error), 'min-h-15 pr-5 text-amount-lg money', symbol.length > 1 ? 'pl-16' : 'pl-10')}
          {...input}
        />
      </div>
      {availableLabel && (
        <p id={`${id}-help`} className="mt-2 text-label font-normal text-ink-soft money">
          {availableLabel}
        </p>
      )}
      <div id={`${id}-live`} aria-live="polite">
        {error ? (
          <FieldMessage id={`${id}-error`} tone="error">
            {error}
          </FieldMessage>
        ) : (
          okMessage && (
            <FieldMessage id={`${id}-ok`} tone="success">
              {okMessage}
            </FieldMessage>
          )
        )}
      </div>
    </div>
  )
}

export function SelectField({
  id,
  label,
  error,
  options,
  placeholder,
  className,
  ...select
}: BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & { options: readonly { value: string; label: string }[]; placeholder?: string }) {
  return (
    <div className={cx('flex min-w-0 flex-col', className)}>
      <label htmlFor={id} className="mb-1.5 text-label">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cx(CONTROL, borderFor(error), 'min-h-12 cursor-pointer appearance-none truncate pl-4 pr-10')}
          {...select}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon as={ChevronDown} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
      </div>
      {error && (
        <FieldMessage id={`${id}-error`} tone="error">
          {error}
        </FieldMessage>
      )}
    </div>
  )
}

/** A value that cannot be edited, with the reason. */
export function LockedField({ id, label, value, reason }: { id: string; label: string; value: string; reason: string }) {
  return (
    <div className="flex flex-col">
      <span id={id} className="mb-1.5 text-label">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={id}
        aria-describedby={`${id}-reason`}
        className="flex min-h-12 items-center gap-2.5 rounded-pill border-[1.5px] border-dashed border-neutral-500 bg-neutral-200 px-4.5"
      >
        <Icon as={Lock} size={16} />
        <span className="font-bold money">{value}</span>
        <span className="ml-auto text-caption font-bold text-ink-soft">Bloqueado</span>
      </div>
      <p id={`${id}-reason`} className="mt-1.5 text-[0.84rem] text-ink-soft">
        {reason}
      </p>
    </div>
  )
}
