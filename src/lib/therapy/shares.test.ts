import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHARE_DURATION_MINUTES,
  isShareActive,
  parseShareDuration,
  SHARE_DURATION_MINUTES,
  shareExpiry,
} from './shares'

const NOW_MS = Date.UTC(2026, 7, 9, 21, 34, 12)
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

describe('share duration', () => {
  it('accepts every length the panel offers', () => {
    for (const minutes of SHARE_DURATION_MINUTES) {
      expect(parseShareDuration(minutes), `${minutes} minutes`).toBe(minutes)
    }
  })

  // Without this a crafted body would mint a link that outlives anything the owner was ever shown.
  it('refuses any length that was never offered', () => {
    for (const value of [0, -15, 5, 14, 61, 2880, 10_080, 1440.5, '60', null, undefined, Number.NaN, {}]) {
      // 2880 is two days: a length between two that are offered is still not one of them.
      expect(parseShareDuration(value), JSON.stringify(value) ?? 'undefined').toBeNull()
    }
  })

  // The product rule: nothing shorter than a quarter of an hour, nothing longer than three days.
  it('offers nothing under fifteen minutes and nothing over three days', () => {
    for (const minutes of SHARE_DURATION_MINUTES) {
      expect(minutes, `${minutes} minutes`).toBeGreaterThanOrEqual(15)
      expect(minutes, `${minutes} minutes`).toBeLessThanOrEqual(3 * 24 * 60)
    }
  })

  it('defaults to a length the panel offers', () => {
    expect(SHARE_DURATION_MINUTES).toContain(DEFAULT_SHARE_DURATION_MINUTES)
  })
})

describe('share expiry', () => {
  it('lasts exactly the minutes the chosen length is worth, whatever the runtime clock does', () => {
    expect(shareExpiry(15, NOW_MS).getTime()).toBe(NOW_MS + 15 * MINUTE_MS)
    expect(shareExpiry(60, NOW_MS).getTime()).toBe(NOW_MS + HOUR_MS)
    expect(shareExpiry(1440, NOW_MS).getTime()).toBe(NOW_MS + 24 * HOUR_MS)
    expect(shareExpiry(4320, NOW_MS).getTime()).toBe(NOW_MS + 72 * HOUR_MS)
  })

  it('counts from the moment it was asked for, not from the top of the hour', () => {
    expect(shareExpiry(15, NOW_MS + MINUTE_MS).getTime()).toBe(NOW_MS + MINUTE_MS + 15 * MINUTE_MS)
  })
})

describe('share activity', () => {
  it('keeps a link with time left', () => {
    expect(isShareActive({ expiresAt: new Date(NOW_MS + 1) }, NOW_MS)).toBe(true)
  })

  // The whole point of the feature is that access ends, so the boundary belongs to the owner.
  it('drops a link the instant it expires', () => {
    expect(isShareActive({ expiresAt: new Date(NOW_MS) }, NOW_MS)).toBe(false)
    expect(isShareActive({ expiresAt: new Date(NOW_MS - 1) }, NOW_MS)).toBe(false)
  })
})
