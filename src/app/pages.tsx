// Placeholder screens so routing and the session can be exercised end to end.
// They are replaced by the real screens when the design arrives (wallet-core tasks 5.x).
import { Navigate } from 'react-router'
import { useSession } from '@/features/session/useSession'

export function LoginPage() {
  const { state } = useSession()
  if (state.status === 'signedIn') return <Navigate to="/" replace />

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      {state.reason === 'expired' && (
        <p role="status" className="mt-4">
          Tu sesión terminó. Vuelve a iniciar sesión.
        </p>
      )}
      <p className="mt-4 text-slate-500">Pantalla provisoria: el formulario llega con el diseño.</p>
    </main>
  )
}

export function HomePage() {
  const { signOut } = useSession()

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Inicio</h1>
      <button type="button" className="mt-4 underline" onClick={() => signOut('loggedOut')}>
        Cerrar sesión
      </button>
    </main>
  )
}

export function MovementsPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Movimientos</h1>
    </main>
  )
}
