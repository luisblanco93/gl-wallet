/**
 * Guards that turn API JSON into domain types. Anything money rules cannot trust
 * (non-finite amounts, unknown enums, transfers without side) rejects the whole
 * response as `server`, so no partial or guessed figure reaches the UI.
 *
 * API shapes (mock API):
 * - account: { id, userId, name, currency, createdAt, balance: number }
 * - transaction: { id, accountId, type, direction: 'in'|'out'|null, amount: number, currency,
 *   category: string|null, description: string|null, status, counterpartAccountId: string|null,
 *   transferId: string|null, createdAt }
 * - list: { transactions: transaction[], pagination: { page, pageSize, total } }
 */
import { toCents } from '@/domain/money'
import {
  CURRENCIES,
  MOVEMENT_STATUSES,
  MOVEMENT_TYPES,
  TRANSFER_DIRECTIONS,
  type Account,
  type Movement,
  type MovementType,
  type User,
} from '@/domain/types'
import { untrustworthyResponse } from './errors'

type JsonObject = Readonly<Record<string, unknown>>

/** The API stores `category || 'other'`, so a missing category means `other`. */
const DEFAULT_CATEGORY = 'other'

function reject(what: string): never {
  throw untrustworthyResponse(`Unexpected API data: ${what}`)
}

function asObject(value: unknown, what: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) reject(what)
  return value as JsonObject
}

function asArray(value: unknown, what: string): readonly unknown[] {
  if (!Array.isArray(value)) reject(what)
  return value
}

function asString(value: unknown, what: string): string {
  if (typeof value !== 'string') reject(what)
  return value
}

function asNumber(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) reject(what)
  return value
}

function asCount(value: unknown, what: string): number {
  const count = asNumber(value, what)
  if (!Number.isInteger(count) || count < 0) reject(what)
  return count
}

function asOneOf<T extends string>(value: unknown, allowed: readonly T[], what: string): T {
  const match = allowed.find((option) => option === value)
  if (match === undefined) reject(what)
  return match
}

function asOptionalString(value: unknown, fallback: string, what: string): string {
  return value === null || value === undefined ? fallback : asString(value, what)
}

/** Reads `body[key]`, e.g. the `accounts` array of `{ accounts: [...] }`. */
export function readField(body: unknown, key: string): unknown {
  return asObject(body, 'response body')[key]
}

export function parseToken(value: unknown): string {
  const token = asString(value, 'token')
  if (token === '') reject('token')
  return token
}

export function parseUser(value: unknown): User {
  const user = asObject(value, 'user')
  return {
    id: asString(user.id, 'user.id'),
    email: asString(user.email, 'user.email'),
    name: asString(user.name, 'user.name'),
  }
}

export function parseAccount(value: unknown): Account {
  const account = asObject(value, 'account')
  return {
    id: asString(account.id, 'account.id'),
    name: asString(account.name, 'account.name'),
    currency: asOneOf(account.currency, CURRENCIES, 'account.currency'),
    balance: toCents(asNumber(account.balance, 'account.balance')),
  }
}

function parseTransferSide(movement: JsonObject, type: MovementType) {
  if (type !== 'transfer') return { direction: null, counterpartAccountId: null, transferId: null }
  return {
    direction: asOneOf(movement.direction, TRANSFER_DIRECTIONS, 'transaction.direction'),
    counterpartAccountId: asString(movement.counterpartAccountId, 'transaction.counterpartAccountId'),
    // Display only: a missing receipt id hides the receipt instead of rejecting the response.
    transferId: typeof movement.transferId === 'string' && movement.transferId !== '' ? movement.transferId : null,
  }
}

export function parseMovement(value: unknown): Movement {
  const movement = asObject(value, 'transaction')
  const type = asOneOf(movement.type, MOVEMENT_TYPES, 'transaction.type')
  const amount = asNumber(movement.amount, 'transaction.amount')
  if (amount <= 0) reject('transaction.amount')

  return {
    id: asString(movement.id, 'transaction.id'),
    accountId: asString(movement.accountId, 'transaction.accountId'),
    type,
    ...parseTransferSide(movement, type),
    amount: toCents(amount),
    currency: asOneOf(movement.currency, CURRENCIES, 'transaction.currency'),
    category: asOptionalString(movement.category, DEFAULT_CATEGORY, 'transaction.category'),
    description: asOptionalString(movement.description, '', 'transaction.description'),
    status: asOneOf(movement.status, MOVEMENT_STATUSES, 'transaction.status'),
    createdAt: asString(movement.createdAt, 'transaction.createdAt'),
  }
}

export function parseList<T>(value: unknown, parseItem: (item: unknown) => T, what: string): T[] {
  return asArray(value, what).map(parseItem)
}

export function parsePagination(value: unknown): { page: number; pageSize: number; total: number } {
  const pagination = asObject(value, 'pagination')
  return {
    page: asCount(pagination.page, 'pagination.page'),
    pageSize: asCount(pagination.pageSize, 'pagination.pageSize'),
    total: asCount(pagination.total, 'pagination.total'),
  }
}
