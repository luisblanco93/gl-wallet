import { QueryClient } from '@tanstack/react-query'
import { shouldRetry } from '@/api/errors'

/**
 * Queries retry `network` and `server` once and never 4xx; mutations are never
 * retried, so money is never moved twice by a retry. A factory so tests get a fresh client.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry },
      mutations: { retry: 0 },
    },
  })
}
