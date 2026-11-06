import type { Result } from '@/domain/result'

export type Credentials = { readonly email: string; readonly password: string }

export type CredentialErrors = {
  readonly email?: 'required' | 'invalid'
  readonly password?: 'required'
}

/** Something@something.tld without spaces; the API validates the rest. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function emailError(email: string): CredentialErrors['email'] {
  if (email === '') return 'required'
  return EMAIL_PATTERN.test(email) ? undefined : 'invalid'
}

/** Checked before `POST /auth/login`: both fields present and a well-formed email. */
export function validateCredentials(email: string, password: string): Result<Credentials, CredentialErrors> {
  const trimmedEmail = email.trim()
  const emailProblem = emailError(trimmedEmail)
  const errors: CredentialErrors = {
    ...(emailProblem ? { email: emailProblem } : {}),
    ...(password === '' ? { password: 'required' as const } : {}),
  }
  if (Object.keys(errors).length > 0) return { ok: false, error: errors }
  return { ok: true, value: { email: trimmedEmail, password } }
}
