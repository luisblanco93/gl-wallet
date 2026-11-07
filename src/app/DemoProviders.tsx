import { lazy, Suspense, type ReactNode } from 'react'
import { withDemoFaults } from '@/api/demoFaults'
import { config } from '@/config'
import { createDemoStore } from '@/features/demo/demoState'
import { DemoToolsContext } from '@/features/demo/DemoToolsContext'
import { createAppServices } from './services'
import { AppServiceProviders } from './providers'

const store = createDemoStore()
const services = createAppServices({
  apiUrl: config.apiUrl,
  fetch: withDemoFaults((input, init) => globalThis.fetch(input, init), { apiUrl: config.apiUrl, faults: store }),
  storage: window.sessionStorage,
})
const DemoPanel = lazy(() => import('@/features/demo/DemoPanel'))
let activeFaults = store.getSnapshot().faults
store.subscribe(() => {
  const next = store.getSnapshot().faults
  if (next !== activeFaults) {
    activeFaults = next
    void services.queryClient.invalidateQueries()
  }
})

export default function DemoProviders({ children }: { children: ReactNode }) {
  return (
    <DemoToolsContext value={store}>
      <AppServiceProviders services={services}>
        <Suspense fallback={null}><DemoPanel store={store} /></Suspense>
        <div style={{ paddingTop: 'var(--demo-panel-h, 0px)' }} className="transition-[padding-top] duration-200 ease-out motion-reduce:transition-none">
          {children}
        </div>
      </AppServiceProviders>
    </DemoToolsContext>
  )
}
