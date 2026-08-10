import { describe, expect, it } from 'vitest'
import { allEvents, eventIndices, importPapData, truncateToTenth } from '@/lib/pap'
import { writeSyntheticCard } from '@/lib/pap/synthetic/card'
import type { PapDay, PapEvent, PapSession } from '@/lib/pap'
import { toDayIndexRow } from './day-index'

const HOUR_MS = 3_600_000

function session(startMs: number, durationMs: number, events: PapEvent[] = []): PapSession {
  return { id: `s${startMs}`, startMs, endMs: startMs + durationMs, channels: [], events }
}

function apnea(startMs: number): PapEvent {
  return { type: 'obstructiveApnea', startMs, durationMs: 15_000 }
}

describe('stored day index', () => {
  it('stores the numbers the device reported rather than recomputing them', () => {
    const card = writeSyntheticCard({ seed: 'index', dates: ['2026-08-08'] })
    const day = importPapData(card).days[0]

    const row = toDayIndexRow(day)

    expect(day.summary).not.toBeNull()
    expect(row.ahi).toBe(day.summary?.ahi)
    expect(row.usageMinutes).toBe(day.summary?.usageMinutes)
    expect(row.leakP95).toBe(day.summary?.leak.percentile95)
    expect(row.pressureP95).toBe(day.summary?.maskPressure.percentile95)
  })

  it('carries one bound per parsed session', () => {
    const card = writeSyntheticCard({ seed: 'index', dates: ['2026-08-08'] })
    const day = importPapData(card).days[0]

    const row = toDayIndexRow(day)

    expect(row.sessionBounds).toEqual(day.sessions.map((entry) => ({ startMs: entry.startMs, endMs: entry.endMs })))
    expect(row.sessionBounds.length).toBeGreaterThan(0)
  })

  it('rounds every moment to a whole millisecond, because the columns holding them are integers', () => {
    const card = writeSyntheticCard({ seed: 'index', dates: ['2026-08-08'] })
    const day = importPapData(card).days[0]

    const row = toDayIndexRow(day)

    expect(row.events.length).toBeGreaterThan(0)
    for (const event of row.events) {
      expect(Number.isInteger(event.startMs), `start of ${event.type} at ${event.startMs}`).toBe(true)
      expect(Number.isInteger(event.durationMs), `duration of ${event.type}`).toBe(true)
    }
    expect(Number.isInteger(row.startMs)).toBe(true)
    expect(Number.isInteger(row.endMs)).toBe(true)
    for (const bounds of row.sessionBounds) {
      expect(Number.isInteger(bounds.startMs)).toBe(true)
      expect(Number.isInteger(bounds.endMs)).toBe(true)
    }
  })

  it('derives the index of a night the device never summarised, truncated the way the device truncates', () => {
    const early = Array.from({ length: 12 }, (_, index) => apnea(index * 540_000))
    const late = Array.from({ length: 5 }, (_, index) => apnea(2 * HOUR_MS + index * 600_000))
    const day: PapDay = {
      date: '2026-08-08',
      startMs: 0,
      endMs: 3 * HOUR_MS,
      sessions: [session(0, 2 * HOUR_MS, early), session(2 * HOUR_MS, HOUR_MS, late)],
      summary: null,
      settings: null,
    }

    const row = toDayIndexRow(day)

    expect(row.ahi).toBe(5.6)
    expect(row.usageMinutes).toBe(180)
    expect(row.leakP95).toBeNull()
    expect(row.pressureP95).toBeNull()
  })

  it('derives the one index a card left out, while keeping the ones it reported', () => {
    const card = writeSyntheticCard({ seed: 'index', dates: ['2026-08-08'] })
    const parsed = importPapData(card).days[0]
    const day: PapDay = { ...parsed, summary: { ...parsed.summary!, reraIndex: null } }

    const row = toDayIndexRow(day)

    expect(row.ahi).toBe(parsed.summary?.ahi)
    expect(row.reraIndex).not.toBeNull()
    expect(row.reraIndex).toBe(
      truncateToTenth(eventIndices(allEvents(day.sessions), row.usageMinutes * 60_000).reraIndex),
    )
  })

  it('leaves periodic breathing out of a derived index', () => {
    const day: PapDay = {
      date: '2026-08-08',
      startMs: 0,
      endMs: 2 * HOUR_MS,
      sessions: [
        session(0, 2 * HOUR_MS, [
          apnea(60_000),
          apnea(120_000),
          { type: 'periodicBreathing', startMs: 300_000, durationMs: 480_000 },
        ]),
      ],
      summary: null,
      settings: null,
    }

    const row = toDayIndexRow(day)

    expect(row.ahi).toBe(1)
    expect(row.events).toHaveLength(3)
  })
})
