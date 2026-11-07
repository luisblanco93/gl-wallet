import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DemoToolsContext } from './DemoToolsContext'
import { createDemoStore } from './demoState'
import { useDemoLogoTap } from './useDemoLogoTap'

afterEach(() => vi.restoreAllMocks())

function setup() {
  const store = createDemoStore()
  const hook = renderHook(() => useDemoLogoTap(), {
    wrapper: ({ children }) => <DemoToolsContext value={store}>{children}</DemoToolsContext>,
  })
  return { store, ...hook }
}

describe('demo logo gesture', () => {
  it('does not attach a gesture when demo tools are unavailable', () => {
    expect(renderHook(() => useDemoLogoTap()).result.current).toBeUndefined()
  })

  it('opens after five activations within two seconds and closes after five more', () => {
    let now = 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const { store, result } = setup()
    act(() => {
      for (let index = 0; index < 4; index++) {
        result.current?.()
        now += 100
      }
    })
    expect(store.getSnapshot().open).toBe(false)
    act(() => result.current?.())
    expect(store.getSnapshot().open).toBe(true)
    act(() => {
      for (let index = 0; index < 5; index++) result.current?.()
    })
    expect(store.getSnapshot().open).toBe(false)
  })

  it('discards a stale sequence rather than counting taps across the two-second limit', () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const { store, result } = setup()
    act(() => {
      for (let index = 0; index < 4; index++) result.current?.()
      now = 2001
      result.current?.()
    })
    expect(store.getSnapshot().open).toBe(false)
    act(() => {
      for (let index = 0; index < 4; index++) result.current?.()
    })
    expect(store.getSnapshot().open).toBe(true)
  })
})
