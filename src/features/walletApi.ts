import { createContext, useContext } from 'react'
import type { WalletApi } from '@/api/endpoints'

/** Provided by `app`; keeps `api` free of React and lets tests inject a fake API. */
export const WalletApiContext = createContext<WalletApi | null>(null)

export function useWalletApi(): WalletApi {
  const api = useContext(WalletApiContext)
  if (!api) throw new Error('useWalletApi must be used inside WalletApiContext')
  return api
}
