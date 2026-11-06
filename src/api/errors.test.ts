import { describe, expect, it } from 'vitest'
import { ApiError, networkError, shouldRetry, toApiError } from './errors'

describe('toApiError', () => {
  it('maps a 400 with field errors to validation, one message per field', () => {
    const error = toApiError(400, {
      errors: [
        { field: 'amount', message: 'amount must be at least 0.01' },
        { field: 'category', message: 'category is invalid' },
      ],
    })
    expect(error.kind).toBe('validation')
    expect(error.fieldErrors).toEqual({
      amount: 'amount must be at least 0.01',
      category: 'category is invalid',
    })
  })

  it('keeps the first message when a field has several', () => {
    const error = toApiError(400, {
      errors: [
        { field: 'name', message: 'first' },
        { field: 'name', message: 'second' },
      ],
    })
    expect(error.fieldErrors).toEqual({ name: 'first' })
  })

  it('maps a 400 with a message to badRequest, keeping the message only as detail', () => {
    const error = toApiError(400, { error: 'Transfers cannot be edited' })
    expect(error.kind).toBe('badRequest')
    expect(error.detail).toBe('Transfers cannot be edited')
    expect(error.fieldErrors).toEqual({})
  })

  it('maps a 400 without a JSON body to badRequest without detail', () => {
    const error = toApiError(400, undefined)
    expect(error.kind).toBe('badRequest')
    expect(error.detail).toBeUndefined()
  })

  it('maps a 400 with malformed field errors to badRequest', () => {
    expect(toApiError(400, { errors: [{ field: 1 }] }).kind).toBe('badRequest')
  })

  it('maps 401, 404 and 422 by status', () => {
    expect(toApiError(401, { error: 'Invalid token' }).kind).toBe('unauthorized')
    expect(toApiError(404, undefined).kind).toBe('notFound')
    expect(toApiError(422, { error: 'Insufficient funds in source account' }).kind).toBe('insufficientFunds')
  })

  it('maps other 4xx to badRequest and 5xx to server', () => {
    expect(toApiError(403, undefined).kind).toBe('badRequest')
    expect(toApiError(409, { error: 'Conflict' }).kind).toBe('badRequest')
    expect(toApiError(500, undefined).kind).toBe('server')
    expect(toApiError(503, undefined).kind).toBe('server')
  })

  it('is an Error whose message never contains the response body', () => {
    const error = toApiError(400, { error: 'at /home/server/index.ts:42' })
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).not.toContain('/home/server')
  })
})

describe('shouldRetry', () => {
  it('retries network and server errors once', () => {
    expect(shouldRetry(0, networkError())).toBe(true)
    expect(shouldRetry(0, toApiError(500, undefined))).toBe(true)
    expect(shouldRetry(1, networkError())).toBe(false)
    expect(shouldRetry(1, toApiError(500, undefined))).toBe(false)
  })

  it('never retries 4xx errors', () => {
    for (const status of [400, 401, 404, 422]) {
      expect(shouldRetry(0, toApiError(status, undefined))).toBe(false)
    }
  })

  it('never retries errors that are not ApiError', () => {
    expect(shouldRetry(0, new TypeError('bug'))).toBe(false)
  })
})
