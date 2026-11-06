import { ArrowLeftRight, ArrowRight, Plus, RotateCw, WifiOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/shared/ui/Button'
import { LoadingRegion, Skeleton, StateMessage } from '@/shared/ui/Feedback'
import { Icon } from '@/shared/ui/Icon'
import { PageTitle } from '@/shared/ui/PageTitle'
import { useSession } from '@/features/session/useSession'
import { toMovementRowView } from '@/features/movements/movementView'
import { TransactionRow, TransactionRowSkeletonList } from '@/features/movements/TransactionRow'
import { useMovements } from '@/features/movements/useMovements'
import { AccountCard } from './AccountCard'
import { toAccountCardView } from './accountView'
import { useAccounts, type AccountView } from './useAccounts'

const RECENT_COUNT = 5
const FIRST_PAGE = { page: 1 } as const

export function HomePage() {
  const { state } = useSession()
  const navigate = useNavigate()
  const accounts = useAccounts()
  const userName = state.status === 'signedIn' ? state.session.user.name : ''

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-body text-ink-muted">Hola, {userName}</span>
          <PageTitle>Tu dinero</PageTitle>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button icon={ArrowLeftRight} onClick={() => navigate('/transferir')}>
            Transferir
          </Button>
          <Button variant="secondary" icon={Plus} onClick={() => navigate('/movimientos/nuevo')}>
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
            <div className="flex flex-col gap-1">
              <h2 id="balances-title" className="text-title">
                Saldos por cuenta
              </h2>
              <p className="text-caption text-ink-muted">Cada moneda se muestra por separado: no se suman entre sí.</p>
            </div>
            {accounts.status === 'loading' ? (
              <AccountCardsSkeleton />
            ) : (
              <AccountCards accounts={accounts.accounts} pending={accounts.pending} onRetryPending={accounts.retryPending} />
            )}
          </section>
          <RecentMovements ownAccounts={accounts.status === 'ready' ? accounts.accounts : []} />
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

function RecentMovements({ ownAccounts }: { ownAccounts: readonly AccountView[] }) {
  const navigate = useNavigate()
  const movements = useMovements(FIRST_PAGE, RECENT_COUNT)

  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-title" className="text-title">
          Últimos movimientos
        </h2>
        <Link to="/movimientos" className="inline-flex items-center gap-1.5 rounded-pill px-1 text-sm font-bold text-link hover:underline">
          Ver todos
          <Icon as={ArrowRight} size={16} />
        </Link>
      </div>
      {movements.status === 'loading' && <TransactionRowSkeletonList rows={RECENT_COUNT} />}
      {movements.status === 'error' && (
        <StateMessage
          tone="error"
          icon={WifiOff}
          title="No pudimos cargar tus movimientos"
          description="Revisa tu conexión a internet e inténtalo de nuevo."
          action={{ label: 'Reintentar', icon: RotateCw, onClick: movements.retry }}
        />
      )}
      {movements.status === 'ready' &&
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
                  compact
                  row={toMovementRowView(movement, ownAccounts)}
                  onSelect={(id) => navigate(`/movimientos/${encodeURIComponent(id)}`)}
                />
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
