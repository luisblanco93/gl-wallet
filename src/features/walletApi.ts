import { createContext, useContext } from 'react'
import type { WalletApi } from '@/api/endpoints'
import type { FxApi } from '@/api/fx'

/** The wallet API plus the external FX source, composed in `app`; `api` keeps them separate. */
export type AppApi = WalletApi & FxApi

/** Provided by `app`; keeps `api` free of React and lets tests inject a fake API. */
export const WalletApiContext = createContext<AppApi | null>(null)

export function useWalletApi(): AppApi {
  const api = useContext(WalletApiContext)
  if (!api) throw new Error('useWalletApi must be used inside WalletApiContext')
  return api
}
