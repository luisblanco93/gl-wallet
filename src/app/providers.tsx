import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, type ReactNode } from 'react'
import { config } from '@/config'
import { createAppServices, type AppServices } from './services'
import { SessionProvider } from '@/features/session/SessionProvider'
import { ToastProvider } from '@/features/toast/ToastProvider'
import { WalletApiContext } from '@/features/walletApi'

// Keep the import behind Vite's literal build guard so disabled demo chunks are never emitted.
const DemoProviders = (import.meta.env.DEV || import.meta.env.VITE_DEMO_TOOLS === 'true')
  ? lazy(() => import('./DemoProviders'))
  : undefined

const services = DemoProviders ? undefined : createAppServices({
  apiUrl: config.apiUrl,
  fetch: (input, init) => globalThis.fetch(input, init),
  storage: window.sessionStorage,
})

export function AppProviders({ children }: { children: ReactNode }) {
  if (DemoProviders) return <Suspense fallback={null}><DemoProviders>{children}</DemoProviders></Suspense>
  return <AppServiceProviders services={services!}>{children}</AppServiceProviders>
}

export function AppServiceProviders({ children, services }: { children: ReactNode; services: AppServices }) {
  return (
    <QueryClientProvider client={services.queryClient}>
      <SessionProvider store={services.sessionStore}>
        <WalletApiContext value={services.walletApi}>
          <ToastProvider>{children}</ToastProvider>
        </WalletApiContext>
      </SessionProvider>
    </QueryClientProvider>
  )
}
