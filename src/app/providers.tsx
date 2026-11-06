import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { config } from '@/config'
import { createAppServices } from './services'
import { SessionProvider } from './SessionProvider'

const services = createAppServices({
  apiUrl: config.apiUrl,
  fetch: (input, init) => globalThis.fetch(input, init),
  storage: window.sessionStorage,
})

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={services.queryClient}>
      <SessionProvider store={services.sessionStore}>{children}</SessionProvider>
    </QueryClientProvider>
  )
}
