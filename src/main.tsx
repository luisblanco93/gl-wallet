import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from '@/app/App'
import { AppProviders } from '@/app/providers'
import { getTheme } from '@/app/theme'

document.documentElement.dataset.theme = getTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
