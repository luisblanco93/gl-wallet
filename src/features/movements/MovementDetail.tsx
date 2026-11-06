import { Lock, RotateCw, SearchX, WifiOff } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useParams } from 'react-router'
import { Alert, LoadingRegion, Skeleton, StateMessage } from '@/shared/ui/Feedback'
import { cx } from '@/shared/ui/cx'
import { CategoryIcon } from '@/shared/ui/Icon'
import { SidePanel } from '@/shared/ui/SidePanel'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { Movement } from '@/domain/types'
import { EditMovementForm, type EditSubmission } from './EditMovementForm'
import { useEditMovement } from './useEditMovement'
import { useMovementDetailContext } from './movementDetailContext'
import { toMovementDetailView } from './movementDetailView'
import type { OwnAccount } from './movementView'
import { useMovement } from './useMovement'

const PANEL_ID = 'movement-detail'

/** `/movimientos/:id`: the detail over the movement list. */
export function MovementDetail() {
  const { id = '' } = useParams()
  const { ownAccounts, close } = useMovementDetailContext()
  return <MovementDetailPanel id={id} ownAccounts={ownAccounts} onClose={() => close(id)} />
}

/** A movement's detail in a side panel over the current screen, with its edit form or why it cannot change. */
export function MovementDetailPanel({
  id,
  ownAccounts,
  onClose,
}: {
  id: string
  ownAccounts: readonly OwnAccount[]
  onClose: () => void
}) {
  const result = useMovement(id)

  return (
    <SidePanel id={PANEL_ID} heading="Detalle del movimiento" closeLabel="Cerrar detalle" onClose={onClose}>
      {result.status === 'loading' && (
        <LoadingRegion label="Cargando movimiento…">
          <div aria-hidden="true" className="flex flex-col gap-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </LoadingRegion>
      )}
      {result.status === 'notFound' && (
        <StateMessage
          icon={SearchX}
          title="No encontramos este movimiento"
          description="Puede que el enlace esté incompleto o que el movimiento no sea de tus cuentas."
        />
      )}
      {result.status === 'error' && (
        <StateMessage
          tone="error"
          icon={WifiOff}
          title="No pudimos cargar el movimiento"
          description="Revisa tu conexión a internet e inténtalo de nuevo."
          action={{ label: 'Reintentar', icon: RotateCw, onClick: result.retry }}
        />
      )}
      {result.status === 'ready' && <MovementDetailBody movement={result.movement} ownAccounts={ownAccounts} />}
    </SidePanel>
  )
}

function MovementDetailBody({ movement, ownAccounts }: { movement: Movement; ownAccounts: readonly OwnAccount[] }) {
  const view = toMovementDetailView(movement, ownAccounts)
  const edit = useEditMovement()
  // The confirmation lives in the panel: a modal dialog makes the app's toast region inert and covers it.
  const submission: EditSubmission = {
    submit: (changes) => edit.submit({ movement, edit: changes }),
    isSaving: edit.isPending,
    isSaved: edit.isSuccess,
    error: edit.error,
  }
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <>
      <div className="flex items-center gap-3.5">
        <CategoryIcon category={view.category} size={22} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-soft">{view.typeLabel}</p>
          <h2 ref={titleRef} tabIndex={-1} className="text-[1.375rem] font-bold outline-none">
            {view.title}
          </h2>
        </div>
      </div>
      <div className="flex flex-col items-start gap-2">
        <span className={cx('text-amount-xl money', view.tone === 'income' ? 'text-income' : 'text-expense')}>
          {view.amountLabel}
        </span>
        <StatusBadge status={view.status} />
      </div>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-5 gap-y-2.5">
        {view.facts.map((fact) => (
          <div key={fact.label} className="contents">
            <dt className="text-ink-muted">{fact.label}</dt>
            <dd className="font-semibold money-wrap">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {view.editable ? (
        // Remounts after a saved edit, so the form starts from the stored values.
        <EditMovementForm
          key={JSON.stringify([movement.category, movement.description])}
          movement={movement}
          amountLabel={view.amountLabel}
          submission={submission}
        />
      ) : (
        <Alert tone="info" icon={Lock} title="Las transferencias no se pueden editar" role="note">
          Ya se enviaron a otra cuenta, así que su monto, destino y descripción quedan fijos. Si hubo un error,
          comunícate con quien recibió el dinero.
        </Alert>
      )}
    </>
  )
}
