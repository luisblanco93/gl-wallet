import { createContext } from 'react'
import type { DemoStore } from './demoState'

export const DemoToolsContext = /* @__PURE__ */ createContext<DemoStore | undefined>(undefined)
