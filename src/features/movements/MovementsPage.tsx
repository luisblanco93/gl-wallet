import { Plus, RotateCw, SearchX, WifiOff } from 'lucide-react'
import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { useAccounts } from '@/features/accounts/useAccounts'
import { Button } from '@/shared/ui/Button'
import { StateMessage } from '@/shared/ui/Feedback'
import { PageTitle } from '@/shared/ui/PageTitle'
import { ActiveFilters, FilterBar, Pagination, type FilterValues } from './FilterBar'
import { ALL, activeFilterChips, filterOptions, type FilterKey } from './filterView'
import { filterChange, type MovementListState } from './filters'
import type { MovementDetailContext } from './movementDetailContext'
import { toMovementRowView, type OwnAccount } from './movementView'
import { TransactionListHeader, TransactionRow, TransactionRowSkeletonList } from './TransactionRow'
import { useMovementList } from './useMovementList'
import { useMovements, type MovementsResult } from './useMovements'
import { useReturnFocusToRow } from './useReturnFocusToRow'

function filterValues(state: MovementListState): FilterValues {
  return {
    accountId: state.accountId ?? ALL,
    type: state.type ?? ALL,
    category: state.category ?? ALL,
    status: state.status ?? ALL,
  }
}

export function MovementsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: openId } = useParams()
  const list = useMovementList()
  const movements = useMovements(list.state)
  const accounts = useAccounts()
  const ownAccounts = accounts.status === 'ready' ? accounts.accounts : []

  const { registerRow, focusRowOnClose } = useReturnFocusToRow(openId !== undefined)

  // Only once the requested page has loaded: while it loads the previous page stays on screen.
  const outOfRange = movements.status === 'ready' && !movements.isUpdating && movements.page > movements.pageCount
  const lastPage = movements.status === 'ready' ? movements.pageCount : 1
  const { setPage } = list
  useEffect(() => {
    if (outOfRange) setPage(lastPage)
  }, [outOfRange, lastPage, setPage])

  const openDetail = (id: string) =>
    navigate({ pathname: `/movimientos/${encodeURIComponent(id)}`, search: location.search })

  const detailContext: MovementDetailContext = {
    ownAccounts,
    close: (id) => {
      focusRowOnClose(id)
      navigate({ pathname: '/movimientos', search: location.search })
    },
  }

  const chips = activeFilterChips(list.state, ownAccounts)
  const changeFilter = (key: FilterKey, value: string) => list.setFilters(filterChange(key, value))
  const removeChip = (key: FilterKey | 'search') =>
    key === 'search' ? list.setSearchText('') : changeFilter(key, ALL)

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle>Movimientos</PageTitle>
        <Button variant="secondary" icon={Plus} onClick={() => navigate('/movimientos/nuevo')}>
          Nuevo movimiento
        </Button>
      </header>

      <FilterBar
        idPrefix="movements"
        searchText={list.searchText}
        onSearchText={list.setSearchText}
        values={filterValues(list.state)}
        options={filterOptions(list.state, ownAccounts)}
        onChange={changeFilter}
        activeCount={chips.filter((chip) => chip.key !== 'search').length}
      />
      <ActiveFilters chips={chips} onRemove={removeChip} onClearAll={list.clearFilters} />

      <MovementList
        movements={movements}
        ownAccounts={ownAccounts}
        registerRow={registerRow}
        onSelect={openDetail}
        onClearFilters={list.clearFilters}
        onNewMovement={() => navigate('/movimientos/nuevo')}
        onPage={list.setPage}
      />

      <Outlet context={detailContext} />
    </>
  )
}

function MovementList({
  movements,
  ownAccounts,
  registerRow,
  onSelect,
  onClearFilters,
  onNewMovement,
  onPage,
}: {
  movements: MovementsResult
  ownAccounts: readonly OwnAccount[]
  registerRow: (id: string) => (element: HTMLButtonElement | null) => void
  onSelect: (id: string) => void
  onClearFilters: () => void
  onNewMovement: () => void
  onPage: (page: number) => void
}) {
  if (movements.status === 'loading') return <TransactionRowSkeletonList rows={8} />
  if (movements.status === 'error') {
    return (
      <StateMessage
        tone="error"
        icon={WifiOff}
        title="No pudimos cargar tus movimientos"
        description="Revisa tu conexión a internet e inténtalo de nuevo."
        action={{ label: 'Reintentar', icon: RotateCw, onClick: movements.retry }}
      />
    )
  }
  if (movements.empty === 'noResults') {
    return (
      <StateMessage
        icon={SearchX}
        title="No hay movimientos con estos filtros"
        description="Prueba con otra búsqueda o quita alguno de los filtros activos."
        action={{ label: 'Limpiar filtros', onClick: onClearFilters }}
      />
    )
  }
  if (movements.empty === 'noMovements') {
    return (
      <StateMessage
        title="Aún no tienes movimientos"
        description="Registra tu primer ingreso o gasto para empezar a ver tu historial."
        action={{ label: 'Nuevo movimiento', icon: Plus, onClick: onNewMovement }}
      />
    )
  }

  const { range } = movements
  return (
    <section aria-label="Lista de movimientos" aria-busy={movements.isUpdating} className="flex flex-col gap-4">
      <div className="rounded-xl bg-paper p-1.5">
        <TransactionListHeader />
        <ul className="flex flex-col">
          {movements.items.map((movement) => (
            <li key={movement.id}>
              <TransactionRow
                ref={registerRow(movement.id)}
                row={toMovementRowView(movement, ownAccounts)}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      </div>
      <Pagination
        from={range.from}
        to={range.to}
        total={range.total}
        page={movements.page}
        pageCount={movements.pageCount}
        onPage={onPage}
      />
    </section>
  )
}
