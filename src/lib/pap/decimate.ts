import type { ChannelId, PapSession } from './types'

export interface DecimatedSeries {
  x: number[]
  y: (number | null)[]
  min: number
  max: number
  unit: string
  sampleCount: number
}

const EMPTY: DecimatedSeries = { x: [], y: [], min: 0, max: 1, unit: '', sampleCount: 0 }

/**
 * Every channel drawn in one chart row shares a single x array, because a chart plots them against
 * one axis: uPlot takes `[x, ...ys]` and reads every series at the same index. Deriving the buckets
 * from the window rather than from each channel's own sample grid is what keeps them aligned, so two
 * channels that differ in sample rate, in how much they vary, or in which sessions recorded them
 * still land on the same clock. A channel with nothing in a bucket gets a null there, which is also
 * how the gap between two sessions is drawn.
 */
export function decimate(
  sessions: PapSession[],
  channelIds: ChannelId[],
  fromMs: number,
  toMs: number,
  targetPoints: number,
): DecimatedSeries[] {
  const buckets = Math.max(1, Math.floor(targetPoints / 2))
  const bucketMs = (toMs - fromMs) / buckets
  if (!Number.isFinite(bucketMs) || bucketMs <= 0) return channelIds.map(() => EMPTY)

  const recorded = channelIds.map((id) =>
    sessions.flatMap((session) => session.channels.filter((channel) => channel.id === id && channel.values.length > 0)),
  )

  const x: number[] = []
  const drawn = channelIds.map(() => ({
    y: [] as (number | null)[],
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
    unit: '',
    sampleCount: 0,
  }))

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const bucketFrom = fromMs + bucket * bucketMs
    const bucketTo = bucketFrom + bucketMs

    x.push(bucketFrom, bucketFrom + bucketMs / 2)

    for (const [index, slices] of recorded.entries()) {
      const series = drawn[index]
      let low = Number.POSITIVE_INFINITY
      let high = Number.NEGATIVE_INFINITY
      let lowAt = Number.POSITIVE_INFINITY
      let highAt = Number.POSITIVE_INFINITY

      for (const slice of slices) {
        const firstIndex = Math.max(0, Math.ceil((bucketFrom - slice.startMs) / slice.intervalMs))
        const lastIndex = Math.min(slice.values.length, Math.ceil((bucketTo - slice.startMs) / slice.intervalMs))

        for (let i = firstIndex; i < lastIndex; i += 1) {
          const value = slice.values[i]
          if (!Number.isFinite(value)) continue

          const at = slice.startMs + i * slice.intervalMs
          series.sampleCount += 1
          if (series.unit === '') series.unit = slice.unit
          if (value < low) {
            low = value
            lowAt = at
          }
          if (value > high) {
            high = value
            highAt = at
          }
        }
      }

      if (low === Number.POSITIVE_INFINITY) {
        series.y.push(null, null)
        continue
      }

      if (low < series.min) series.min = low
      if (high > series.max) series.max = high
      series.y.push(lowAt <= highAt ? low : high, lowAt <= highAt ? high : low)
    }
  }

  return drawn.map((series) =>
    series.sampleCount === 0
      ? EMPTY
      : {
          x,
          y: series.y,
          min: series.min,
          max: series.max,
          unit: series.unit,
          sampleCount: series.sampleCount,
        },
  )
}

export function channelExists(sessions: PapSession[], channelId: ChannelId): boolean {
  return sessions.some((session) => session.channels.some((channel) => channel.id === channelId))
}
