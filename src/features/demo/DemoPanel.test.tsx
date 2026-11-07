import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemoStore } from './demoState'
import DemoPanel from './DemoPanel'

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.documentElement.style.removeProperty('--demo-panel-h')
})

describe('DemoPanel', () => {
  it('keeps the closed panel inert and exposes all named switches when opened', () => {
    const store = createDemoStore()
    render(<DemoPanel store={store} />)
    expect(screen.queryByRole('region', { name: 'Herramientas de demostración' })).not.toBeInTheDocument()
    expect(screen.queryByText('Simulación activa')).not.toBeInTheDocument()

    act(() => store.togglePanel())
    expect(screen.getByRole('region', { name: 'Herramientas de demostración' })).not.toHaveAttribute('inert')
    expect(screen.getAllByRole('switch')).toHaveLength(14)
    expect(screen.getByRole('switch', { name: 'API sin conexión' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Se pierde la respuesta' })).toHaveAccessibleDescription(
      'La operación se envía de verdad, pero se pierde la respuesta. Revisa Movimientos antes de repetirla.',
    )
    expect(screen.getByRole('button', { name: 'Cerrar panel de demostración' })).toHaveFocus()
  })

  it('shows the strip after Escape and allows reopening and clearing every scenario', async () => {
    const store = createDemoStore()
    const user = userEvent.setup()
    render(<><button>Origen</button><DemoPanel store={store} /></>)
    screen.getByRole('button', { name: 'Origen' }).focus()
    act(() => store.togglePanel())
    const offline = screen.getByRole('switch', { name: 'API sin conexión' })
    await user.click(offline)
    expect(offline).toBeChecked()
    expect(screen.getByText('1 escenario activo')).toBeInTheDocument()

    fireEvent.keyDown(offline, { key: 'Escape' })
    expect(screen.getByText('Simulación activa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Origen' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Abrir panel de demostración' }))
    expect(screen.getByRole('switch', { name: 'API sin conexión' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Apagar todo' }))
    expect(screen.getByRole('switch', { name: 'API sin conexión' })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Cerrar panel de demostración' }))
    expect(screen.queryByText('Simulación activa')).not.toBeInTheDocument()
  })

  it('lets the closed strip turn off every scenario without reopening', async () => {
    const store = createDemoStore()
    store.toggleFault('serverError')
    render(<DemoPanel store={store} />)
    await userEvent.click(screen.getByRole('button', { name: 'Apagar todo' }))
    expect(store.getSnapshot().faults).toEqual([])
    expect(store.getSnapshot().open).toBe(false)
    expect(screen.queryByText('Simulación activa')).not.toBeInTheDocument()
  })

  it('publishes only the visible panel or strip height and removes it on unmount', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { height: this.getAttribute('aria-label') === 'Simulación activa' ? 48 : 240 } as DOMRect
    })
    const store = createDemoStore()
    const { unmount } = render(<DemoPanel store={store} />)
    const offset = () => document.documentElement.style.getPropertyValue('--demo-panel-h')
    expect(offset()).toBe('0px')
    act(() => store.togglePanel())
    expect(offset()).toBe('240px')
    act(() => { store.toggleFault('offline'); store.closePanel() })
    expect(offset()).toBe('48px')
    act(() => store.turnOffAll())
    expect(offset()).toBe('0px')
    unmount()
    expect(offset()).toBe('')
  })
})
