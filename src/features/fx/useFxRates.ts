import { useQuery } from '@tanstack/react-query'
import type { FxRates } from '@/domain/fx'
import { useWalletApi } from '@/features/walletApi'

export const FX_RATES_KEY = ['fxRates'] as const
/** Rates are reused for 10 minutes: about 6 requests per hour per open tab (dolarapi documents no limits). */
export const FX_CACHE_MS = 10 * 60 * 1000

/**
 * Official reference rates, or `undefined` while loading or after any failure: estimates are then
 * hidden and nothing else changes. Never retried; kept in cache as long as it is fresh.
 */
export function useFxRates(): FxRates | undefined {
  const api = useWalletApi()
  const query = useQuery({
    queryKey: FX_RATES_KEY,
    queryFn: () => api.getFxRates(),
    staleTime: FX_CACHE_MS,
    gcTime: FX_CACHE_MS,
    retry: false,
  })
  return query.isSuccess ? query.data : undefined
}
