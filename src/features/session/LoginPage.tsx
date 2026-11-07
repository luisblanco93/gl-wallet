import { demoToolsEnabled } from '@/config'
import { useDemoLogoTap } from '@/features/demo/useDemoLogoTap'
import { CircleCheck, Clock } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { ApiError } from '@/api/errors'
import { BlockedError } from '@/features/blockedError'
import { Brand } from '@/shared/ui/Brand'
import { Button } from '@/shared/ui/Button'
import { Alert } from '@/shared/ui/Feedback'
import { PasswordField, TextField } from '@/shared/ui/Field'
import { Icon } from '@/shared/ui/Icon'
import { PageTitle } from '@/shared/ui/PageTitle'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { validateCredentials, type CredentialErrors } from './credentials'
import { useLogin } from './useLogin'
import { useSession } from './useSession'

const useLogoClick = demoToolsEnabled ? useDemoLogoTap : () => undefined

const EMAIL_ERRORS = {
  required: 'Ingresa tu email.',
  invalid: 'El email no tiene un formato válido. Ejemplo: nombre@dominio.com',
} as const
const PASSWORD_REQUIRED = 'Ingresa tu contraseña.'

function LoginError({ error }: { error: Error }) {
  if (error instanceof ApiError && error.kind === 'unauthorized') {
    return (
      <Alert tone="error" title="Email o contraseña incorrectos">
        Revisa los datos e inténtalo de nuevo.
      </Alert>
    )
  }
  return (
    <Alert tone="error" title="No pudimos conectar con el servidor">
      Revisa tu conexión a internet e inténtalo de nuevo.
    </Alert>
  )
}

export function LoginPage() {
  const onLogoClick = useLogoClick()
  const { state } = useSession()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setPasswordVisible] = useState(false)
  const [errors, setErrors] = useState<CredentialErrors>({})
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  if (state.status === 'signedIn') return <Navigate to="/" replace />

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const valid = validateCredentials(email, password)
    if (!valid.ok) {
      setErrors(valid.error)
      ;(valid.error.email ? emailRef : passwordRef).current?.focus()
      return
    }
    setErrors({})
    login.submit({ email, password })
  }

  const isSending = login.isPending
  const showExpired = state.reason === 'expired' && !login.error

  return (
    <div className="min-h-dvh bg-bg px-4 py-6 text-ink md:px-10 md:py-8">
      <Brand onClick={onLogoClick} />
      <main className="mx-auto mt-10 grid max-w-[65rem] grid-cols-[repeat(auto-fit,minmax(min(22.5rem,100%),1fr))] gap-10">
        <section className="flex max-w-[26.25rem] flex-col gap-5">
          <PageTitle>Iniciar sesión</PageTitle>
          {showExpired && (
            <Alert tone="warning" icon={Clock} title="Tu sesión venció">
              Por seguridad, cerramos tu sesión. Inicia sesión de nuevo para continuar.
            </Alert>
          )}
          {login.error && !(login.error instanceof BlockedError) && <LoginError error={login.error} />}
          <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-xl bg-surface p-7">
            <TextField
              ref={emailRef}
              id="login-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={errors.email && EMAIL_ERRORS[errors.email]}
              disabled={isSending}
            />
            <PasswordField
              ref={passwordRef}
              id="login-password"
              label="Contraseña"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={errors.password && PASSWORD_REQUIRED}
              visible={isPasswordVisible}
              onToggleVisible={() => setPasswordVisible((visible) => !visible)}
              disabled={isSending}
            />
            <Button type="submit" className="w-full" loading={isSending} loadingLabel="Iniciando sesión…">
              Iniciar sesión
            </Button>
          </form>
        </section>
        <MoneyLegend />
      </main>
    </div>
  )
}

function MoneyLegend() {
  return (
    <aside aria-label="Cómo leer tu dinero" className="flex max-w-[25rem] flex-col gap-3.5 self-center">
      <h2 className="text-title">Cómo leer tu dinero en Wallet</h2>
      <dl className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <dt className="inline-flex items-center gap-1.5 font-bold text-available">
            <Icon as={CircleCheck} size={16} />
            Disponible
          </dt>
          <dd className="text-ink-soft">El dinero que puedes usar ahora.</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt>
            <StatusBadge status="pending" label="En proceso" />
          </dt>
          <dd className="text-ink-soft">Transferencias enviadas que aún no llegan. Ya están descontadas del disponible.</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt>
            <StatusBadge status="completed" label="Acreditado" />
          </dt>
          <dd className="text-ink-soft">El dinero llegó a la cuenta destino.</dd>
        </div>
      </dl>
    </aside>
  )
}
