import { MutationObserver, onlineManager } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '@/api/client'
import { createQueryClient } from './queryClient'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** A query client without retry delay, and a fetch whose calls we count. */
function setup(respond: () => Promise<Response>) {
  const fetch = vi.fn<typeof globalThis.fetch>(respond)
  const api = createApiClient({ baseUrl: 'http://api.test', fetch, getToken: () => 't', onUnauthorized: () => {} })
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  })
  const fetchAccounts = () =>
    queryClient.fetchQuery({ queryKey: ['accounts'], queryFn: () => api.request('GET', '/accounts') })
  return { api, fetch, queryClient, fetchAccounts }
}

describe('createQueryClient', () => {
  it('retries a network error once (two requests in total)', async () => {
    const { fetch, fetchAccounts } = setup(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(fetchAccounts()).rejects.toMatchObject({ kind: 'network' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('retries a server error once', async () => {
    const { fetch, fetchAccounts } = setup(() => Promise.resolve(jsonResponse(500, {})))
    await expect(fetchAccounts()).rejects.toMatchObject({ kind: 'server' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 404', async () => {
    const { fetch, fetchAccounts } = setup(() => Promise.resolve(jsonResponse(404, { error: 'Not found' })))
    await expect(fetchAccounts()).rejects.toMatchObject({ kind: 'notFound' })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('never retries a mutation, even on a network error', async () => {
    const { api, fetch, queryClient } = setup(() => Promise.reject(new TypeError('Failed to fetch')))
    const observer = new MutationObserver(queryClient, {
      mutationFn: () => api.request('POST', '/transactions', { body: {} }),
    })
    await expect(observer.mutate()).rejects.toMatchObject({ kind: 'network' })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('sends a mutation while the browser reports offline instead of queueing it for later', async () => {
    const { api, fetch, queryClient } = setup(() => Promise.reject(new TypeError('Failed to fetch')))
    onlineManager.setOnline(false)
    try {
      const observer = new MutationObserver(queryClient, {
        mutationFn: () => api.request('POST', '/transfers', { body: {} }),
      })
      await expect(observer.mutate()).rejects.toMatchObject({ kind: 'network' })
      expect(fetch).toHaveBeenCalledOnce()
    } finally {
      onlineManager.setOnline(true)
    }
  })

  it('fails a query while the browser reports offline instead of pausing it', async () => {
    const { fetchAccounts } = setup(() => Promise.reject(new TypeError('Failed to fetch')))
    onlineManager.setOnline(false)
    try {
      await expect(fetchAccounts()).rejects.toMatchObject({ kind: 'network' })
    } finally {
      onlineManager.setOnline(true)
    }
  })

  it('gives each call a fresh client', () => {
    expect(createQueryClient()).not.toBe(createQueryClient())
  })
})
