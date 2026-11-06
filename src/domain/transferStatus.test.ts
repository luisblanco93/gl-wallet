import { describe, expect, it } from 'vitest'
import { TRANSFER_POLL_INTERVAL_MS, TRANSFER_POLL_MAX_MS, listShouldRefresh, nextPoll } from './transferStatus'

describe('nextPoll', () => {
  it('polls again in 1 s while the transfer is pending and younger than 10 s', () => {
    expect(nextPoll('pending', 1500)).toEqual({ poll: true, inMs: TRANSFER_POLL_INTERVAL_MS })
  })

  it('stops as completed once the transfer settles', () => {
    expect(nextPoll('completed', 1500)).toEqual({ poll: false, outcome: 'completed' })
  })

  it('stops as delayed when the transfer is still pending after 10 s', () => {
    expect(nextPoll('pending', TRANSFER_POLL_MAX_MS)).toEqual({ poll: false, outcome: 'delayed' })
  })

  it('stops as delayed when the elapsed time cannot be computed', () => {
    expect(nextPoll('pending', Number.NaN)).toEqual({ poll: false, outcome: 'delayed' })
  })

  it('stops as failed when the API reports a failed transfer', () => {
    expect(nextPoll('failed', 1500)).toEqual({ poll: false, outcome: 'failed' })
  })
})

describe('listShouldRefresh', () => {
  const now = Date.parse('2026-11-06T15:00:20.000Z')

  it('refreshes while the newest pending row is younger than 10 s', () => {
    expect(listShouldRefresh(['2026-11-06T14:59:00.000Z', '2026-11-06T15:00:15.000Z'], now)).toBe(true)
  })

  it('stops when every pending row is older than 10 s, or there are none', () => {
    expect(listShouldRefresh(['2026-11-06T15:00:05.000Z'], now)).toBe(false)
    expect(listShouldRefresh([], now)).toBe(false)
  })
})
