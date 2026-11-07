import { describe, expect, it, vi } from 'vitest'
import { createDemoStore } from './demoState'

describe('demo scenario state', () => {
  it('starts closed with every scenario off and does not persist between stores', () => {
    const first = createDemoStore()
    expect(first.getSnapshot()).toEqual({ open: false, faults: [] })
    expect(first.getSnapshot()).toBe(first.getSnapshot())
    first.toggleFault('offline')
    expect(first.isOn('offline')).toBe(true)
    expect(createDemoStore().isOn('offline')).toBe(false)
  })

  it('publishes immutable snapshots and unsubscribes listeners', () => {
    const store = createDemoStore()
    const original = store.getSnapshot()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.toggleFault('offline')
    expect(listener).toHaveBeenCalledOnce()
    expect(store.getSnapshot().faults).toEqual(['offline'])
    expect(original).toEqual({ open: false, faults: [] })
    unsubscribe()
    store.toggleFault('offline')
    expect(listener).toHaveBeenCalledOnce()
    expect(store.isOn('offline')).toBe(false)
  })

  it('turns off the expired-session scenario without changing the other active scenarios', () => {
    const store = createDemoStore()
    store.toggleFault('offline')
    store.toggleFault('sessionExpired')
    store.turnOff('sessionExpired')
    expect(store.getSnapshot().faults).toEqual(['offline'])
    expect(store.isOn('sessionExpired')).toBe(false)
  })

  it('keeps scenario state when opening and closing and can turn everything off', () => {
    const store = createDemoStore()
    store.toggleFault('serverError')
    const faults = store.getSnapshot().faults
    store.togglePanel()
    expect(store.getSnapshot()).toEqual({ open: true, faults: ['serverError'] })
    expect(store.getSnapshot().faults).toBe(faults)
    store.closePanel()
    expect(store.getSnapshot()).toEqual({ open: false, faults: ['serverError'] })
    store.togglePanel()
    store.turnOffAll()
    expect(store.getSnapshot()).toEqual({ open: true, faults: [] })
  })
})
