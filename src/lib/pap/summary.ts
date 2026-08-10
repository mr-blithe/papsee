import { applyScaling } from './edf/signals'
import type { DigitalSession } from './digital'
import type { ChannelId, DaySummary, StatSummary } from './types'

const NOTHING: StatSummary = { median: null, percentile95: null, max: null }

/** The channels a night can be summarised from. The rest of `DaySummary` is not a waveform reading. */
const MEASURED: ChannelId[] = ['maskPressure', 'leak', 'respiratoryRate', 'tidalVolume', 'minuteVentilation']

function nearestRank(sorted: Float32Array, fraction: number): number {
  const rank = Math.ceil(fraction * sorted.length)
  return sorted[Math.min(Math.max(rank - 1, 0), sorted.length - 1)]
}

/**
 * The middle, the 95th and the largest reading of one channel across a whole night. ResMed reads these
 * off the card, so this exists for the brands that write no summary of their own and would otherwise
 * leave the statistics panel and the leak and pressure trends empty.
 */
export function channelStat(sessions: DigitalSession[], id: ChannelId): StatSummary {
  const parts: Float32Array[] = []
  let count = 0

  for (const session of sessions) {
    const channel = session.channels.find((candidate) => candidate.id === id)
    if (!channel) continue

    const values = applyScaling(channel.samples, { scale: channel.scale, offset: channel.offset })
    parts.push(values)
    count += values.length
  }

  if (count === 0) return NOTHING

  const pooled = new Float32Array(count)
  let at = 0
  for (const part of parts) {
    pooled.set(part, at)
    at += part.length
  }
  pooled.sort()

  return {
    median: nearestRank(pooled, 0.5),
    percentile95: nearestRank(pooled, 0.95),
    max: pooled[pooled.length - 1],
  }
}

/**
 * What a night says about itself when its card carried no summary file. Only the readings the panel has
 * no other source for are filled: every index and the usage minutes are counted from the events by
 * `toDayIndexRow`, and putting a computed number in a field that means "the device reported this" would
 * make the two disagree.
 */
export function deriveDaySummary(sessions: DigitalSession[]): DaySummary | null {
  const measured = new Map(MEASURED.map((id) => [id, channelStat(sessions, id)]))
  const stat = (id: ChannelId) => measured.get(id) ?? NOTHING

  if ([...measured.values()].every((entry) => entry.max === null)) return null

  return {
    usageMinutes: null,
    maskEvents: null,
    ahi: null,
    ai: null,
    hi: null,
    oai: null,
    cai: null,
    uai: null,
    reraIndex: null,
    csrMinutes: null,
    maskPressure: stat('maskPressure'),
    leak: stat('leak'),
    minuteVentilation: stat('minuteVentilation'),
    respiratoryRate: stat('respiratoryRate'),
    tidalVolume: stat('tidalVolume'),
    targetEpap: NOTHING,
    ambientHumidity: null,
    humidifierTemperature: null,
  }
}
