// Placeholder screens until their delivery: movements, detail and new movement (wallet-core 5.4–5.6)
// and transfers (change `transfers`).
import { PageTitle } from '@/shared/ui/PageTitle'

function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageTitle>{title}</PageTitle>
      <p className="text-ink-muted">Pantalla en construcción.</p>
    </>
  )
}

export function MovementsPage() {
  return <Placeholder title="Movimientos" />
}

export function NewMovementPage() {
  return <Placeholder title="Nuevo movimiento" />
}

export function TransferPage() {
  return <Placeholder title="Transferir" />
}
