import { ArrowLeftRight, ArrowRight, Plus, RotateCw, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { estimatedTotalArs } from '@/domain/fx'
import { formatMoney } from '@/domain/money'
import { useFxRates } from '@/features/fx/useFxRates'
import { rateLabel } from '@/features/fx/estimateLabel'
import { Button } from '@/shared/ui/Button'
import { LoadingRegion, Skeleton, StateMessage } from '@/shared/ui/Feedback'
import { Icon } from '@/shared/ui/Icon'
import { PageTitle } from '@/shared/ui/PageTitle'
import { useSession } from '@/features/session/useSession'
import { MovementDetailPanel } from '@/features/movements/MovementDetail'
import { toMovementRowView } from '@/features/movements/movementView'
import { TransactionRow, TransactionRowSkeletonList } from '@/features/movements/TransactionRow'
import { useMovements } from '@/features/movements/useMovements'
import { useReturnFocusToRow } from '@/features/movements/useReturnFocusToRow'
import { AccountCard } from './AccountCard'
import { NewAccountForm } from './NewAccountForm'
import { toAccountCardView } from './accountView'
import { useAccounts, type AccountView } from './useAccounts'

const RECENT_COUNT = 5
const FIRST_PAGE = { page: 1 } as const
/** The movement whose detail is open over home; in the URL, so Back closes it and a reload keeps it. */
const DETAIL_PARAM = 'movimiento'

export function HomePage() {
  const { state } = useSession()
  const navigate = useNavigate()
  const accounts = useAccounts()
  const userName = state.status === 'signedIn' ? state.session.user.name : ''
  const [isAddingAccount, setAddingAccount] = useState(false)
  const newAccountButtonRef = useRef<HTMLButtonElement>(null)
  const [returnFocus, setReturnFocus] = useState(0)
  useEffect(() => {
    if (returnFocus > 0) newAccountButtonRef.current?.focus()
  }, [returnFocus])
  const closeNewAccount = () => {
    setAddingAccount(false)
    setReturnFocus((count) => count + 1)
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-body text-ink-muted">Hola, {userName}</span>
          <PageTitle>Tu dinero</PageTitle>
        </div>
        <div className="grid w-full grid-cols-2 gap-2.5 md:flex md:w-auto">
          <Button
            className="min-w-0 max-md:px-2 max-md:text-sm max-md:[&>svg]:hidden"
            icon={ArrowLeftRight}
            onClick={() => navigate('/transferir')}
          >
            Transferir
          </Button>
          <Button
            className="min-w-0 max-md:px-2 max-md:text-sm max-md:[&>svg]:hidden"
            variant="secondary"
            icon={Plus}
            onClick={() => navigate('/movimientos/nuevo')}
          >
            Nuevo movimiento
          </Button>
        </div>
      </header>

      {accounts.status === 'error' ? (
        <StateMessage
          tone="error"
          icon={WifiOff}
          title="No fue posible conectar con el servidor"
          description="Revisa tu conexión a internet e inténtalo de nuevo. Mientras tanto no mostramos saldos, para que no tomes decisiones con datos desactualizados."
          action={{ label: 'Reintentar', icon: RotateCw, onClick: accounts.retry }}
        />
      ) : (
        <>
          <section aria-labelledby="balances-title" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 id="balances-title" className="text-title">
                  Saldos por cuenta
                </h2>
                  <p className="text-caption text-ink-muted max-md:min-h-[2lh]">Cada moneda se muestra por separado: no se suman entre sí.</p>
              </div>
              {!isAddingAccount && (
                <Button
                  ref={newAccountButtonRef}
                  variant="secondary"
                  size="md"
                  icon={Plus}
                  aria-controls="new-account"
                  aria-expanded={false}
                  onClick={() => setAddingAccount(true)}
                >
                  Nueva cuenta
                </Button>
              )}
            </div>
            {isAddingAccount && (
              <div id="new-account">
                <NewAccountForm onDone={closeNewAccount} />
              </div>
            )}
            {accounts.status === 'loading' ? (
              <AccountCardsSkeleton />
            ) : (
              <>
                <AccountCards accounts={accounts.accounts} pending={accounts.pending} onRetryPending={accounts.retryPending} />
                <EstimatedTotal accounts={accounts.accounts} />
              </>
            )}
          </section>
          <RecentMovements
            accountsLoading={accounts.status === 'loading'}
            ownAccounts={accounts.status === 'ready' ? accounts.accounts : []}
          />
        </>
      )}
    </>
  )
}

function AccountCards({
  accounts,
  pending,
  onRetryPending,
}: {
  accounts: readonly AccountView[]
  pending: 'loading' | 'error' | 'ready'
  onRetryPending: () => void
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(18.75rem,100%),1fr))] gap-4">
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={toAccountCardView(account, pending)}
          movementsHref={`/movimientos?accountId=${encodeURIComponent(account.id)}`}
          onRetryAvailable={onRetryPending}
        />
      ))}
    </div>
  )
}

/**
 * A reference figure under the per-currency balances, which stay the primary ones. Hidden while the
 * rates or any available amount are unknown: a total that leaves an account out would mislead.
 */
function EstimatedTotal({ accounts }: { accounts: readonly AccountView[] }) {
  const rates = useFxRates()
  if (rates === undefined || accounts.length === 0) return null
  const total = estimatedTotalArs(accounts, rates)
  if (total === 'unknown') return null
  return (
    <div className="flex flex-col gap-1 rounded-lg border-[1.5px] border-dashed border-line px-5 py-4">
      <p className="text-amount money-wrap">{`Total estimado: ≈ ${formatMoney(total, 'ARS')}`}</p>
      <p className="text-caption text-ink-muted text-pretty">
        Suma de tus disponibles en pesos, {rateLabel(rates)}. Fuente: dolarapi.com. Es una referencia: tu dinero sigue
        en la moneda de cada cuenta.
      </p>
    </div>
  )
}

function AccountCardsSkeleton() {
  return (
    <LoadingRegion label="Cargando saldos…">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(18.75rem,100%),1fr))] gap-4">
        {[0, 1].map((index) => (
          <div key={index} aria-hidden="true" className="flex flex-col gap-4 rounded-xl bg-surface p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-48" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

function RecentMovements({ ownAccounts, accountsLoading }: { ownAccounts: readonly AccountView[]; accountsLoading: boolean }) {
  const navigate = useNavigate()
  const movements = useMovements(FIRST_PAGE, RECENT_COUNT)
  const [params, setParams] = useSearchParams()
  const openId = params.get(DETAIL_PARAM)
  const { registerRow, focusRowOnClose } = useReturnFocusToRow(openId !== null)

  const openDetail = (id: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set(DETAIL_PARAM, id)
      return next
    })
  const closeDetail = (id: string) => {
    focusRowOnClose(id)
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete(DETAIL_PARAM)
        return next
      },
      { replace: true },
    )
  }

  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-title" className="text-title">
          Últimos movimientos
        </h2>
        <Link to="/movimientos" className="-my-3 inline-flex min-h-11 items-center gap-1.5 rounded-pill px-1 text-sm font-bold text-link hover:underline">
          Ver todos
          <Icon as={ArrowRight} size={16} />
        </Link>
      </div>
      {(movements.status === 'loading' || (accountsLoading && movements.status === 'ready')) && (
        <TransactionRowSkeletonList rows={RECENT_COUNT} />
      )}
      {movements.status === 'error' && (
        <StateMessage
          tone="error"
          icon={WifiOff}
          title="No pudimos cargar tus movimientos"
          description="Revisa tu conexión a internet e inténtalo de nuevo."
          action={{ label: 'Reintentar', icon: RotateCw, onClick: movements.retry }}
        />
      )}
      {!accountsLoading && movements.status === 'ready' &&
        (movements.empty ? (
          <StateMessage
            title="Aún no tienes movimientos"
            description="Registra tu primer ingreso o gasto para empezar a ver tu historial."
            action={{ label: 'Nuevo movimiento', icon: Plus, onClick: () => navigate('/movimientos/nuevo') }}
          />
        ) : (
          <ul className="flex flex-col rounded-xl bg-paper p-1.5">
            {movements.items.map((movement) => (
              <li key={movement.id}>
                <TransactionRow
                  ref={registerRow(movement.id)}
                  compact
                  row={toMovementRowView(movement, ownAccounts)}
                  onSelect={openDetail}
                />
              </li>
            ))}
          </ul>
        ))}
      {openId !== null && (
        <MovementDetailPanel id={openId} ownAccounts={ownAccounts} onClose={() => closeDetail(openId)} />
      )}
    </section>
  )
}
