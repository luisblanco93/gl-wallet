import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'icon'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: 'md' | 'lg'
  icon?: LucideIcon
  iconEnd?: LucideIcon
  /** Disables the button and shows `loadingLabel`; the container must also ignore repeated submits. */
  loading?: boolean
  loadingLabel?: string
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-pill font-sans font-bold transition-colors disabled:cursor-not-allowed'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-45',
  secondary: 'border-[1.5px] border-line bg-transparent text-ink hover:bg-ink/7 active:bg-ink/14 disabled:opacity-45',
  ghost: 'bg-transparent px-2 text-link hover:bg-primary-tint disabled:opacity-45',
  icon: 'size-11 bg-transparent p-0 text-ink hover:bg-ink/8 disabled:opacity-45',
}
const SIZES = { md: 'min-h-11 px-5 text-[0.9375rem]', lg: 'min-h-12 px-6 text-base' }

export function Button({
  variant = 'primary',
  size = 'lg',
  icon,
  iconEnd,
  loading,
  loadingLabel,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        BASE,
        VARIANTS[variant],
        variant !== 'icon' && SIZES[size],
        loading && variant === 'primary' && '!bg-primary-hover !opacity-100 cursor-progress',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Icon as={LoaderCircle} className="animate-spin motion-reduce:animate-none" />
      ) : (
        icon && <Icon as={icon} />
      )}
      {loading ? (loadingLabel ?? children) : children}
      {!loading && iconEnd && <Icon as={iconEnd} />}
    </button>
  )
}
