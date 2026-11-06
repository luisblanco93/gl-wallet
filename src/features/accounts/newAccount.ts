import type { NewAccount } from '@/api/endpoints'
import type { Result } from '@/domain/result'

export type AccountNameError = 'nameTooShort' | 'nameTooLong'

const MIN_NAME_LENGTH = 2
const MAX_NAME_LENGTH = 100

/** The name the API will store, trimmed, with its 2–100 character limits checked first. */
export function validateNewAccount(account: NewAccount): Result<NewAccount, AccountNameError> {
  const name = account.name.trim()
  if (name.length < MIN_NAME_LENGTH) return { ok: false, error: 'nameTooShort' }
  if (name.length > MAX_NAME_LENGTH) return { ok: false, error: 'nameTooLong' }
  return { ok: true, value: { name, currency: account.currency } }
}
