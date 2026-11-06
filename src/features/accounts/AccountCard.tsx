import { ArrowRight, CircleCheck, Clock, RotateCw, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Feedback'
import { Icon } from '@/shared/ui/Icon'
import type { AccountCardView } from './accountView'

/** One card per account: currencies are never added together. */
export function AccountCard({
  account,
  movementsHref,
  onRetryAvailable,
}: {
  account: AccountCardView
  movementsHref: string
  onRetryAvailable: () => void
}) {
  const { availability } = account
  return (
    <article aria-label={account.name} className="flex h-full min-w-0 flex-col gap-4 rounded-xl bg-surface p-6">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="break-words text-subtitle">{account.name}</h3>
          <span className="text-caption text-ink-muted">{account.currencyName}</span>
        </div>
        <span className="ml-auto shrink-0 rounded-pill bg-paper px-2.5 py-0.5 text-xs font-bold tracking-wide text-ink-soft">
          {account.code}
        </span>
      </div>

      {availability.kind === 'unknown' ? (
        <UnknownAvailable onRetry={onRetryAvailable} />
      ) : (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-available">
            <Icon as={CircleCheck} size={16} />
            Disponible
          </span>
          {availability.kind === 'known' ? (
            <span className="text-amount-xl money-wrap tracking-[-0.01em]">{availability.label}</span>
          ) : (
            <>
              <span className="sr-only">Calculando disponible…</span>
              <Skeleton className="h-9 w-48" />
            </>
          )}
        </div>
      )}

      {account.pendingLabel && (
        <div className="flex items-start gap-2 rounded-[18px] border-[1.5px] border-dashed border-pending-border bg-pending-bg px-3.5 py-2.5 text-pending">
          <Icon as={Clock} size={16} className="mt-0.5" />
          <div className="flex flex-col">
            <span className="text-sm font-bold money-wrap">En proceso: {account.pendingLabel}</span>
            <span className="text-caption">Ya está descontado del disponible.</span>
          </div>
        </div>
      )}

      <Link
        to={movementsHref}
        className="mt-auto inline-flex min-h-9 items-center gap-1.5 self-start rounded-pill px-1 text-sm font-bold text-link hover:underline"
      >
        Ver movimientos
        <Icon as={ArrowRight} size={16} />
      </Link>
    </article>
  )
}

/** Not drawn in the handoff: built from the warning alert. Debits stay blocked until it is known. */
function UnknownAvailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="status" className="flex flex-col gap-2.5 rounded-lg border-[1.5px] border-warning-border bg-warning-bg px-4 py-3.5 text-warning">
      <span className="inline-flex items-center gap-2 font-bold">
        <Icon as={TriangleAlert} size={18} />
        No pudimos calcular tu disponible
      </span>
      <span className="text-sm">
        Mientras tanto no puedes registrar gastos ni transferir desde esta cuenta, para que no decidas con un dato incompleto.
      </span>
      <Button size="md" variant="secondary" icon={RotateCw} onClick={onRetry} className="self-start">
        Reintentar
      </Button>
    </div>
  )
}
