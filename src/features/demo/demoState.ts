import type { DemoFault } from '@/api/demoFaults'

export type DemoSnapshot = {
  readonly open: boolean
  readonly faults: readonly DemoFault[]
}

export type DemoStore = {
  getSnapshot(): DemoSnapshot
  subscribe(listener: () => void): () => void
  isOn(fault: DemoFault): boolean
  turnOff(fault: DemoFault): void
  toggleFault(fault: DemoFault): void
  turnOffAll(): void
  togglePanel(): void
  closePanel(): void
}

/** Demo choices deliberately live in memory only: a reload clears every injected failure. */
export function createDemoStore(): DemoStore {
  let state: DemoSnapshot = { open: false, faults: [] }
  const listeners = new Set<() => void>()
  const publish = (next: DemoSnapshot) => {
    state = next
    listeners.forEach((listener) => listener())
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    isOn: (fault) => state.faults.includes(fault),
    turnOff(fault) {
      if (state.faults.includes(fault)) {
        publish({ ...state, faults: state.faults.filter((item) => item !== fault) })
      }
    },
    toggleFault(fault) {
      publish({
        ...state,
        faults: state.faults.includes(fault)
          ? state.faults.filter((item) => item !== fault)
          : [...state.faults, fault],
      })
    },
    turnOffAll() {
      if (state.faults.length > 0) publish({ ...state, faults: [] })
    },
    togglePanel() {
      publish({ ...state, open: !state.open })
    },
    closePanel() {
      if (state.open) publish({ ...state, open: false })
    },
  }
}
