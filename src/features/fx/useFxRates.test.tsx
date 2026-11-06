import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { networkError } from '@/api/errors'
import type { FxRates } from '@/domain/fx'
import { createTestProviders } from '@/test/providers'
import { FX_RATES_KEY, useFxRates } from './useFxRates'

const RATES: FxRates = { arsPerUsd: 1545, arsPerEur: 1731, updatedAt: '2026-11-05T17:00:00.000Z' }

describe('useFxRates', () => {
  it('returns the official reference rates', async () => {
    const { api, wrapper } = createTestProviders()
    api.getFxRates.mockResolvedValue(RATES)

    const { result } = renderHook(() => useFxRates(), { wrapper })

    await waitFor(() => expect(result.current).toEqual(RATES))
  })

  it('returns undefined when the FX source fails, without retrying', async () => {
    const { api, queryClient, wrapper } = createTestProviders()
    api.getFxRates.mockRejectedValue(networkError())

    const { result } = renderHook(() => useFxRates(), { wrapper })

    await waitFor(() => expect(queryClient.getQueryState(FX_RATES_KEY)?.status).toBe('error'))
    expect(result.current).toBeUndefined()
    expect(api.getFxRates).toHaveBeenCalledOnce()
  })
})
