import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOAST_DURATION_MS, ToastProvider, ToastRegion } from './ToastProvider'
import { useToast } from './useToast'

function Trigger() {
  const showToast = useToast()
  return (
    <>
      <button type="button" onClick={() => showToast({ kind: 'success', title: 'Gasto registrado' })}>
        uno
      </button>
      <button type="button" onClick={() => showToast({ kind: 'error', title: 'No se pudo guardar' })}>
        dos
      </button>
    </>
  )
}

function renderToasts() {
  return render(
    <ToastProvider>
      <Trigger />
      <ToastRegion />
    </ToastProvider>,
  )
}

describe('toasts', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the region mounted and shows a success toast as a status', async () => {
    renderToasts()
    expect(screen.getByLabelText('Notificaciones')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'uno' }))
    expect(screen.getByRole('status')).toHaveTextContent('Gasto registrado')
  })

  it(`closes a toast by itself after ${TOAST_DURATION_MS} ms`, async () => {
    renderToasts()
    await userEvent.click(screen.getByRole('button', { name: 'uno' }))
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS))
    expect(screen.queryByText('Gasto registrado')).not.toBeInTheDocument()
  })

  it('shows one toast at a time, the next one after the first closes', async () => {
    renderToasts()
    await userEvent.click(screen.getByRole('button', { name: 'uno' }))
    await userEvent.click(screen.getByRole('button', { name: 'dos' }))
    expect(screen.getByText('Gasto registrado')).toBeInTheDocument()
    expect(screen.queryByText('No se pudo guardar')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }))
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar')
  })
})
