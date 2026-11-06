import { toApiAmount } from '@/domain/money'
import type { Account, Cents, Currency, Movement, MovementStatus, MovementType, User } from '@/domain/types'
import type { ApiClient } from './client'
import { ApiError } from './errors'
import { parseAccount, parseList, parseMovement, parsePagination, parseToken, parseUser, readField } from './dto'

export type Session = { readonly token: string; readonly user: User }

export type MovementFilters = {
  readonly accountId?: string
  readonly type?: MovementType
  readonly category?: string
  readonly status?: MovementStatus
  readonly search?: string
}

export type MovementQuery = MovementFilters & { readonly page: number; readonly pageSize: number }

export type MovementPage = {
  readonly items: readonly Movement[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
}

export type NewAccount = { readonly name: string; readonly currency: Currency }

export type NewMovement = {
  readonly accountId: string
  readonly type: 'income' | 'expense'
  readonly amount: Cents
  readonly category: string
  readonly description: string
}

export type MovementEdit = { readonly category: string; readonly description: string }

/** An id as one path segment; empty, `.` or `..` would change the path, so they name no movement. */
function idSegment(id: string): string {
  if (id === '' || id === '.' || id === '..') throw new ApiError('notFound', { detail: 'Invalid movement id' })
  return encodeURIComponent(id)
}

/** The API caps `pageSize` at 50; more pending transfers at once is not expected (see design). */
export const PENDING_TRANSFERS_PAGE_SIZE = 50

function parsePage(body: unknown): MovementPage {
  return {
    items: parseList(readField(body, 'transactions'), parseMovement, 'transactions'),
    ...parsePagination(readField(body, 'pagination')),
  }
}

/** One typed function per endpoint the app uses; every response is mapped to domain types. */
export function createWalletApi(client: Pick<ApiClient, 'request'>) {
  const { request } = client

  return {
    async login(email: string, password: string): Promise<Session> {
      const body = await request('POST', '/auth/login', { body: { email, password }, auth: false })
      return { token: parseToken(readField(body, 'token')), user: parseUser(readField(body, 'user')) }
    },

    async listAccounts(): Promise<Account[]> {
      return parseList(readField(await request('GET', '/accounts'), 'accounts'), parseAccount, 'accounts')
    },

    async createAccount(account: NewAccount): Promise<Account> {
      const body = await request('POST', '/accounts', { body: { name: account.name, currency: account.currency } })
      return parseAccount(readField(body, 'account'))
    },

    async listMovements(query: MovementQuery): Promise<MovementPage> {
      const { accountId, type, category, status, search, page, pageSize } = query
      const body = await request('GET', '/transactions', {
        query: { accountId, type, category, status, search, page, pageSize },
      })
      return parsePage(body)
    },

    async listPendingTransfers(): Promise<Movement[]> {
      const body = await request('GET', '/transactions', {
        query: { type: 'transfer', status: 'pending', page: 1, pageSize: PENDING_TRANSFERS_PAGE_SIZE },
      })
      return [...parsePage(body).items]
    },

    async getMovement(id: string): Promise<Movement> {
      const body = await request('GET', `/transactions/${idSegment(id)}`)
      return parseMovement(readField(body, 'transaction'))
    },

    async createMovement(movement: NewMovement): Promise<Movement> {
      const body = await request('POST', '/transactions', {
        body: {
          accountId: movement.accountId,
          type: movement.type,
          amount: toApiAmount(movement.amount),
          category: movement.category,
          description: movement.description,
        },
      })
      return parseMovement(readField(body, 'transaction'))
    },

    async updateMovement(id: string, edit: MovementEdit): Promise<Movement> {
      const body = await request('PATCH', `/transactions/${idSegment(id)}`, {
        body: { category: edit.category, description: edit.description },
      })
      return parseMovement(readField(body, 'transaction'))
    },
  }
}

export type WalletApi = ReturnType<typeof createWalletApi>
