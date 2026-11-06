const DEFAULT_API_URL = 'http://localhost:3000'

const rawApiUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

export const config = {
  apiUrl: rawApiUrl.replace(/\/+$/, ''),
} as const
