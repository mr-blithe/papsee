import { describe, expect, it } from 'vitest'
import { ahiOverTime, channelAverage, timeAtPressure } from './stats'
import type { ChannelSeries, PapEvent, PapSession } from './types'

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000

function apnea(startMs: number): PapEvent {
  return { type: 'obstructiveApnea', startMs, durationMs: 12_000 }
}

function pressureSession(startMs: number, intervalMs: number, values: number[]): PapSession {
  const channel: ChannelSeries = {
    id: 'therapyPressure',
    unit: 'cmH2O',
    intervalMs,
    startMs,
    values: Float32Array.from(values),
  }

  return { id: String(startMs), startMs, endMs: startMs + values.length * intervalMs, channels: [channel], events: [] }
}

describe('the AHI traced across a night', () => {
  it('reports each sample against a full hour even in the first hour, so the trace ramps up instead of opening at a spike', () => {
    const start = 0
    const trace = ahiOverTime([apnea(MINUTE_MS)], start, HOUR_MS)
    const atFiveMinutes = trace.y[trace.x.indexOf(start + 5 * MINUTE_MS)]

    expect(atFiveMinutes).toBe(1)
  })

  it('counts only what the night index counts, so a RERA never lifts the trace', () => {
    const reraOnly: PapEvent[] = [{ type: 'rera', startMs: MINUTE_MS, durationMs: 10_000 }]

    expect(Math.max(...ahiOverTime(reraOnly, 0, HOUR_MS).y)).toBe(0)
  })

  it('counts hypopnea and every apnea flavour, because AHI is not obstructive events alone', () => {
    const mixed: PapEvent[] = [
      { type: 'obstructiveApnea', startMs: MINUTE_MS, durationMs: 10_000 },
      { type: 'centralApnea', startMs: 2 * MINUTE_MS, durationMs: 10_000 },
      { type: 'unclassifiedApnea', startMs: 3 * MINUTE_MS, durationMs: 10_000 },
      { type: 'apnea', startMs: 4 * MINUTE_MS, durationMs: 10_000 },
      { type: 'hypopnea', startMs: 5 * MINUTE_MS, durationMs: 10_000 },
    ]

    expect(Math.max(...ahiOverTime(mixed, 0, 2 * HOUR_MS).y)).toBe(5)
  })

  it('drops an event out of the window once it is more than an hour behind the sample', () => {
    const trace = ahiOverTime([apnea(MINUTE_MS)], 0, 3 * HOUR_MS)
    const stillInside = trace.y[trace.x.indexOf(60 * MINUTE_MS)]
    const fallenOut = trace.y[trace.x.indexOf(90 * MINUTE_MS)]

    expect(stillInside).toBe(1)
    expect(fallenOut).toBe(0)
  })

  it('steps a minute at a time and never runs past the end of the night', () => {
    const trace = ahiOverTime([], 0, 10 * MINUTE_MS)

    expect(trace.x).toEqual([
      0,
      MINUTE_MS,
      2 * MINUTE_MS,
      3 * MINUTE_MS,
      4 * MINUTE_MS,
      5 * MINUTE_MS,
      6 * MINUTE_MS,
      7 * MINUTE_MS,
      8 * MINUTE_MS,
      9 * MINUTE_MS,
      10 * MINUTE_MS,
    ])
  })
})

describe('the time spent at each pressure', () => {
  it('measures how long the pressure was held, not how many samples landed on it', () => {
    const held = timeAtPressure([pressureSession(0, 2000, [8, 8, 8, 8, 8, 10, 10, 10, 10, 10])])
    const eight = held.minutes[held.pressure.indexOf(8)]
    const ten = held.minutes[held.pressure.indexOf(10)]

    expect(eight).toBeCloseTo(10 / 60, 5)
    expect(ten).toBeCloseTo(10 / 60, 5)
  })

  it('weights a coarse recording the same as a fine one, so a slower channel is not under-counted', () => {
    const coarse = timeAtPressure([pressureSession(0, 10_000, [9, 9])])
    const fine = timeAtPressure([pressureSession(0, 2000, [9, 9, 9, 9, 9, 9, 9, 9, 9, 9])])

    expect(coarse.minutes[coarse.pressure.indexOf(9)]).toBeCloseTo(fine.minutes[fine.pressure.indexOf(9)], 5)
  })

  it('separates pressures a fifth of a unit apart, which a whole number bucket would merge', () => {
    const held = timeAtPressure([pressureSession(0, 2000, [8.0, 8.0, 8.4, 8.4])])

    expect(held.pressure).toEqual([8, 8.4])
  })

  it('adds up every session of the night rather than reporting only the longest', () => {
    const held = timeAtPressure([pressureSession(0, 2000, [7, 7]), pressureSession(HOUR_MS, 2000, [7, 7])])

    expect(held.minutes[held.pressure.indexOf(7)]).toBeCloseTo(8 / 60, 5)
  })

  it('reports nothing when the night recorded no therapy pressure at all', () => {
    expect(timeAtPressure([])).toEqual({ pressure: [], minutes: [] })
  })
})

describe('the average of a channel across a night', () => {
  it('weights every sample the same, whichever session it came from', () => {
    const night = [pressureSession(0, 2000, [4, 6]), pressureSession(HOUR_MS, 2000, [8, 10, 12, 14])]

    expect(channelAverage(night, 'therapyPressure')).toBeCloseTo((4 + 6 + 8 + 10 + 12 + 14) / 6, 5)
  })

  it('reports nothing when the night carries no samples for that channel, rather than zero', () => {
    expect(channelAverage([pressureSession(0, 2000, [5, 5])], 'leak')).toBeNull()
    expect(channelAverage([], 'therapyPressure')).toBeNull()
  })
})
