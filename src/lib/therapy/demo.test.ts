// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { toPapDay } from '@/lib/pap'
import { decodeDayPayload, encodeDayPayload } from '@/lib/pap/day-payload'
import { demoDay, demoDayIndex } from './demo'

const NOW_MS = Date.parse('2026-08-09T21:30:00Z')
const DEMO_NIGHTS = 30

describe('the example patient', () => {
  it('fills the overview with a month of nights rather than an empty chart', () => {
    const index = demoDayIndex(NOW_MS)

    expect(index).toHaveLength(DEMO_NIGHTS)
    expect(index.map((day) => day.date)).toEqual([...index.map((day) => day.date)].sort())
    for (const day of index) {
      expect(day.usageMinutes, day.date).toBeGreaterThan(0)
      expect(day.ahi, day.date).toBeGreaterThanOrEqual(0)
    }
  })

  it('gives the same nights for the same day, so a reload does not rewrite the reader history', () => {
    expect(demoDayIndex(NOW_MS)).toEqual(demoDayIndex(NOW_MS + 3_600_000))
  })

  it('replays the asked for night with its waveforms and nothing from any other night', () => {
    const index = demoDayIndex(NOW_MS)
    const date = index.at(-1)!.date

    const night = demoDay(NOW_MS, date)
    expect(night).not.toBeNull()

    expect(night!.day.date).toBe(date)
    expect(night!.day.sessions.length).toBeGreaterThan(0)
    expect(night!.day.sessions.some((session) => session.channels.length > 0)).toBe(true)
  })

  it('travels the same wire format a stored night does, so demo cannot render a shape no account has', () => {
    const date = demoDayIndex(NOW_MS).at(-1)!.date
    const night = demoDay(NOW_MS, date)!
    const encoded = encodeDayPayload(night.card, night.day)
    const decoded = decodeDayPayload(
      encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer,
    )

    expect(decoded.days).toEqual([toPapDay(night.day)])
    expect(decoded.device).toEqual(night.card.device)
  })

  it('refuses a date outside the example month instead of inventing one', () => {
    expect(demoDay(NOW_MS, '2001-01-01')).toBeNull()
  })
})
