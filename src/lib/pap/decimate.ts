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

export function decimate(
  sessions: PapSession[],
  channelId: ChannelId,
  fromMs: number,
  toMs: number,
  targetPoints: number,
): DecimatedSeries {
  const buckets = Math.max(1, Math.floor(targetPoints / 2))
  const bucketMs = (toMs - fromMs) / buckets
  if (!Number.isFinite(bucketMs) || bucketMs <= 0) return EMPTY

  const x: number[] = []
  const y: (number | null)[] = []
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  let unit = ''
  let sampleCount = 0
  let previousEnd: number | null = null

  for (const session of sessions) {
    const channel = session.channels.find((candidate) => candidate.id === channelId)
    if (!channel || channel.values.length === 0) continue
    unit = channel.unit

    const seriesEnd = channel.startMs + channel.values.length * channel.intervalMs
    if (seriesEnd < fromMs || channel.startMs > toMs) continue

    if (previousEnd !== null) {
      x.push(previousEnd)
      y.push(null)
    }

    const firstIndex = Math.max(0, Math.floor((fromMs - channel.startMs) / channel.intervalMs))
    const lastIndex = Math.min(channel.values.length, Math.ceil((toMs - channel.startMs) / channel.intervalMs))

    let index = firstIndex
    while (index < lastIndex) {
      const bucketStart = channel.startMs + index * channel.intervalMs
      const bucketEndIndex = Math.min(
        lastIndex,
        Math.max(index + 1, Math.ceil((bucketStart + bucketMs - channel.startMs) / channel.intervalMs)),
      )

      let bucketMin = Number.POSITIVE_INFINITY
      let bucketMax = Number.NEGATIVE_INFINITY
      let bucketMinAt = index
      let bucketMaxAt = index

      for (let i = index; i < bucketEndIndex; i += 1) {
        const value = channel.values[i]
        if (!Number.isFinite(value)) continue
        if (value < bucketMin) {
          bucketMin = value
          bucketMinAt = i
        }
        if (value > bucketMax) {
          bucketMax = value
          bucketMaxAt = i
        }
      }

      if (bucketMin !== Number.POSITIVE_INFINITY) {
        sampleCount += bucketEndIndex - index
        if (bucketMin < min) min = bucketMin
        if (bucketMax > max) max = bucketMax

        const first = bucketMinAt <= bucketMaxAt ? bucketMin : bucketMax
        const second = bucketMinAt <= bucketMaxAt ? bucketMax : bucketMin
        x.push(bucketStart)
        y.push(first)
        if (bucketMax !== bucketMin) {
          x.push(bucketStart + bucketMs / 2)
          y.push(second)
        }
      }

      index = bucketEndIndex
      previousEnd = bucketStart + bucketMs
    }
  }

  if (x.length === 0) return EMPTY

  return {
    x,
    y,
    min: min === Number.POSITIVE_INFINITY ? 0 : min,
    max: max === Number.NEGATIVE_INFINITY ? 1 : max,
    unit,
    sampleCount,
  }
}

export function channelExists(sessions: PapSession[], channelId: ChannelId): boolean {
  return sessions.some((session) => session.channels.some((channel) => channel.id === channelId))
}
