import {
  ArrowLeftRight,
  Briefcase,
  Bus,
  CircleEllipsis,
  HeartPulse,
  KeyRound,
  Laptop,
  ShoppingCart,
  Tv,
  Zap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

/** The design system draws every Lucide icon with this stroke. */
const ICON_STROKE = 2.75

const CATEGORY_ICONS: Readonly<Record<string, LucideIcon>> = {
  salary: Briefcase,
  freelance: Laptop,
  rent: KeyRound,
  groceries: ShoppingCart,
  transport: Bus,
  entertainment: Tv,
  utilities: Zap,
  health: HeartPulse,
  transfer: ArrowLeftRight,
  other: CircleEllipsis,
}

export function Icon({ as: As, size = 18, ...rest }: { as: LucideIcon } & LucideProps) {
  return <As size={size} strokeWidth={ICON_STROKE} aria-hidden="true" focusable="false" {...rest} />
}

/** Category icon in its 40px circle; an unknown category gets the "other" icon. */
export function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-200 text-ink">
      <Icon as={CATEGORY_ICONS[category] ?? CircleEllipsis} size={size} />
    </span>
  )
}
