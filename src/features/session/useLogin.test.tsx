import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ApiError, toApiError } from '@/api/errors'
import { BlockedError } from '@/features/blockedError'
import { DEMO_SESSION, createTestProviders } from '@/test/providers'
import { useLogin } from './useLogin'

function setup() {
  const providers = createTestProviders({ signedIn: false })
  const hook = renderHook(() => useLogin(), { wrapper: providers.wrapper })
  return { ...providers, ...hook }
}

describe('useLogin', () => {
  it('signs in with the trimmed email and stores the session', async () => {
    const { api, sessionStore, result } = setup()
    api.login.mockResolvedValue(DEMO_SESSION)

    act(() => result.current.submit({ email: ' demo@example.com ', password: 'demo123' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.login).toHaveBeenCalledWith('demo@example.com', 'demo123')
    expect(sessionStore.getState()).toEqual({ status: 'signedIn', session: DEMO_SESSION })
  })

  it('sends no request when a field is invalid', async () => {
    const { api, result } = setup()
    act(() => result.current.submit({ email: 'demo', password: '' }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as BlockedError<string>).problem).toBe('invalidFields')
    expect(api.login).not.toHaveBeenCalled()
  })

  it('treats a 401 as wrong credentials and stays signed out without the session-ended reason', async () => {
    const { api, sessionStore, result } = setup()
    api.login.mockRejectedValue(toApiError(401, { error: 'Invalid email or password' }))

    act(() => result.current.submit({ email: 'demo@example.com', password: 'wrong' }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect((result.current.error as ApiError).kind).toBe('unauthorized')
    expect(sessionStore.getState()).toEqual({ status: 'signedOut', reason: null })
  })

  it('sends one request when submitted twice while in flight', async () => {
    const { api, result } = setup()
    api.login.mockImplementation(() => new Promise(() => {}))

    act(() => {
      result.current.submit({ email: 'demo@example.com', password: 'demo123' })
      result.current.submit({ email: 'demo@example.com', password: 'demo123' })
    })

    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(api.login).toHaveBeenCalledOnce()
  })
})
