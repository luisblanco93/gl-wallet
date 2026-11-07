import { QueryClient } from '@tanstack/react-query'
import { shouldRetry } from '@/api/errors'

/**
 * Queries retry `network` and `server` once and never 4xx; mutations are never
 * retried, so money is never moved twice by a retry. A factory so tests get a fresh client.
 *
 * `networkMode: 'always'`: with TanStack's default (`'online'`), a request started while the
 * browser reports offline is paused and runs by itself when the connection returns, so a
 * transfer would be sent later without the user confirming again, and the refetch awaited
 * after an error would hang. Instead every request runs and fails as a `network` error.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, networkMode: 'always' },
      mutations: { retry: 0, networkMode: 'always' },
    },
  })
}
