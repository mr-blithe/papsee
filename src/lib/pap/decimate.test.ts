import { describe, expect, it } from 'vitest'
import { channelExists, decimate } from './decimate'
import type { ChannelSeries, PapSession } from './types'

const INTERVAL_MS = 40

function channel(values: number[], startMs: number): ChannelSeries {
  return { id: 'flow', unit: 'L/min', intervalMs: INTERVAL_MS, startMs, values: Float32Array.from(values) }
}

function session(startMs: number, values: number[]): PapSession {
  return {
    id: String(startMs),
    startMs,
    endMs: startMs + values.length * INTERVAL_MS,
    channels: [channel(values, startMs)],
    events: [],
  }
}

describe('spike preservation', () => {
  it('keeps a single sample spike that plain sampling would step over', () => {
    const values = new Array<number>(2000).fill(0)
    values[977] = 180
    const sessions = [session(0, values)]

    const series = decimate(sessions, 'flow', 0, values.length * INTERVAL_MS, 40)

    expect(series.max).toBe(180)
    expect(series.y).toContain(180)
  })

  it('keeps the deepest trough as well as the highest peak in the same bucket', () => {
    const values = new Array<number>(1000).fill(0)
    values[100] = 150
    values[101] = -120
    const sessions = [session(0, values)]

    const series = decimate(sessions, 'flow', 0, values.length * INTERVAL_MS, 20)

    expect(series.max).toBe(150)
    expect(series.min).toBe(-120)
    expect(series.y).toContain(150)
    expect(series.y).toContain(-120)
  })

  it('emits the earlier extreme first so the drawn line keeps the real slope', () => {
    const rising = new Array<number>(200).fill(0)
    rising[10] = -50
    rising[20] = 90

    const series = decimate([session(0, rising)], 'flow', 0, rising.length * INTERVAL_MS, 4)
    const minAt = series.y.indexOf(-50)
    const maxAt = series.y.indexOf(90)

    expect(minAt).toBeGreaterThanOrEqual(0)
    expect(maxAt).toBeGreaterThanOrEqual(0)
    expect(minAt).toBeLessThan(maxAt)
  })
})

describe('gaps between sessions', () => {
  it('breaks the line with a null so two sessions are not joined across the gap', () => {
    const first = session(0, new Array<number>(100).fill(5))
    const second = session(60 * 60_000, new Array<number>(100).fill(7))

    const series = decimate([first, second], 'flow', 0, second.endMs, 200)

    expect(series.y).toContain(null)
  })

  it('does not open a gap inside a single continuous session', () => {
    const series = decimate([session(0, new Array<number>(500).fill(3))], 'flow', 0, 500 * INTERVAL_MS, 100)

    expect(series.y).not.toContain(null)
  })
})

describe('range selection', () => {
  it('skips a session that lies entirely outside the requested window', () => {
    const inside = session(0, new Array<number>(100).fill(4))
    const outside = session(10 * 60 * 60_000, new Array<number>(100).fill(99))

    const series = decimate([inside, outside], 'flow', 0, inside.endMs, 100)

    expect(series.max).toBe(4)
    expect(series.y).not.toContain(99)
  })

  it('carries the channel unit through so the axis cannot be labelled from a stale channel', () => {
    const series = decimate([session(0, [1, 2, 3, 4])], 'flow', 0, 4 * INTERVAL_MS, 10)

    expect(series.unit).toBe('L/min')
  })
})

describe('empty input', () => {
  it('returns a drawable empty series when the channel is absent', () => {
    const series = decimate([session(0, [1, 2, 3])], 'leak', 0, 3 * INTERVAL_MS, 10)

    expect(series.x).toHaveLength(0)
    expect(series.sampleCount).toBe(0)
    expect(series.min).toBe(0)
    expect(series.max).toBe(1)
  })

  it('returns a drawable empty series when the window has no width', () => {
    const series = decimate([session(0, [1, 2, 3])], 'flow', 1000, 1000, 10)

    expect(series.x).toHaveLength(0)
  })
})

describe('channelExists', () => {
  it('finds a channel carried by any session of the day', () => {
    const withFlow = session(0, [1, 2])
    const withoutChannels: PapSession = { id: 'empty', startMs: 0, endMs: 1, channels: [], events: [] }

    expect(channelExists([withoutChannels, withFlow], 'flow')).toBe(true)
    expect(channelExists([withoutChannels, withFlow], 'pulse')).toBe(false)
  })
})
