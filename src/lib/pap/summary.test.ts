import { describe, expect, it } from 'vitest'
import { channelStat, deriveDaySummary } from './summary'
import type { DigitalChannel, DigitalSession } from './digital'
import type { ChannelId } from './types'

function samplesOf(values: number[]): Uint8Array {
  const bytes = new Uint8Array(values.length * 2)
  const view = new DataView(bytes.buffer)
  values.forEach((value, index) => view.setInt16(index * 2, value, true))
  return bytes
}

function channel(id: ChannelId, values: number[], scale = 1, offset = 0): DigitalChannel {
  return { id, unit: 'x', intervalMs: 40, startMs: 0, scale, offset, samples: samplesOf(values) }
}

function session(...channels: DigitalChannel[]): DigitalSession {
  return { startMs: 0, endMs: 1000, channels, events: [] }
}

describe('measuring a channel the card wrote no summary for', () => {
  it('reports the middle reading, the 95th and the largest, which is what the panel shows', () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1)

    const stat = channelStat([session(channel('leak', values))], 'leak')

    expect(stat.median).toBe(50)
    expect(stat.percentile95).toBe(95)
    expect(stat.max).toBe(100)
  })

  it('measures the physical value, not the stored one, so the number carries the channel unit', () => {
    const stat = channelStat([session(channel('maskPressure', [0, 100, 200], 0.05, 4))], 'maskPressure')

    expect(stat.max).toBeCloseTo(14, 6)
    expect(stat.median).toBeCloseTo(9, 6)
  })

  it('pools every session of the night, because a percentile over one of them is not the night', () => {
    const first = session(channel('leak', [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]))
    const second = session(channel('leak', [9, 9, 9, 9, 9, 9, 9, 9, 9, 9]))

    expect(channelStat([first, second], 'leak').median).toBe(1)
    expect(channelStat([first, second], 'leak').max).toBe(9)
  })

  it('reports nothing for a channel the device never recorded, rather than a confident zero', () => {
    const stat = channelStat([session(channel('leak', [1, 2, 3]))], 'tidalVolume')

    expect(stat).toEqual({ median: null, percentile95: null, max: null })
  })
})

describe('the night summary a card without one still owes the reader', () => {
  it('fills the readings the statistics panel has no other source for', () => {
    const summary = deriveDaySummary([session(channel('leak', [10, 20, 30]), channel('maskPressure', [5, 6, 7]))])

    expect(summary?.leak.max).toBe(30)
    expect(summary?.maskPressure.max).toBe(7)
  })

  it('leaves the indices alone, because those are counted from the events and would disagree here', () => {
    const summary = deriveDaySummary([session(channel('leak', [10, 20, 30]))])

    expect(summary?.ahi).toBeNull()
    expect(summary?.usageMinutes).toBeNull()
    expect(summary?.maskEvents).toBeNull()
  })

  it('reports no summary at all for a night it can measure nothing on, so an empty night stays empty', () => {
    expect(deriveDaySummary([])).toBeNull()
    expect(deriveDaySummary([session(channel('flow', [1, 2, 3]))])).toBeNull()
  })
})
