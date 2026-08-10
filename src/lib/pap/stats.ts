import type { ChannelId, EventCounts, EventIndices, PapEvent, PapSession } from './types'

const HOUR_MS = 3_600_000
const MINUTE_MS = 60_000
const AHI_WINDOW_MS = HOUR_MS
const AHI_STEP_MS = MINUTE_MS
const AHI_EVENT_TYPES = new Set<PapEvent['type']>([
  'obstructiveApnea',
  'centralApnea',
  'unclassifiedApnea',
  'apnea',
  'hypopnea',
])
const PRESSURE_BUCKETS_PER_UNIT = 5

const EMPTY_COUNTS: EventCounts = {
  obstructiveApnea: 0,
  centralApnea: 0,
  unclassifiedApnea: 0,
  apnea: 0,
  hypopnea: 0,
  rera: 0,
}

export function countEvents(events: PapEvent[]): EventCounts {
  const counts = { ...EMPTY_COUNTS }
  for (const event of events) {
    if (event.type === 'periodicBreathing') continue
    counts[event.type] += 1
  }
  return counts
}

function perHour(count: number, hours: number): number {
  return hours > 0 ? count / hours : 0
}

export function eventIndices(events: PapEvent[], durationMs: number): EventIndices {
  const counts = countEvents(events)
  const hours = durationMs / HOUR_MS
  const apneas = counts.obstructiveApnea + counts.centralApnea + counts.unclassifiedApnea + counts.apnea

  return {
    ...counts,
    ahi: perHour(apneas + counts.hypopnea, hours),
    ai: perHour(apneas, hours),
    hi: perHour(counts.hypopnea, hours),
    oai: perHour(counts.obstructiveApnea, hours),
    cai: perHour(counts.centralApnea, hours),
    uai: perHour(counts.unclassifiedApnea + counts.apnea, hours),
    reraIndex: perHour(counts.rera, hours),
  }
}

export interface AhiTrace {
  x: number[]
  y: number[]
}

export function ahiOverTime(events: PapEvent[], fromMs: number, toMs: number): AhiTrace {
  const scored = events
    .filter((event) => AHI_EVENT_TYPES.has(event.type))
    .map((event) => event.startMs)
    .sort((a, b) => a - b)

  const x: number[] = []
  const y: number[] = []
  let oldest = 0
  let newest = 0
  let inWindow = 0

  for (let at = fromMs; at <= toMs; at += AHI_STEP_MS) {
    while (newest < scored.length && scored[newest] <= at) {
      inWindow += 1
      newest += 1
    }
    while (oldest < newest && scored[oldest] < at - AHI_WINDOW_MS) {
      inWindow -= 1
      oldest += 1
    }

    x.push(at)
    y.push(inWindow)
  }

  return { x, y }
}

export interface PressureDwell {
  pressure: number[]
  minutes: number[]
}

export function timeAtPressure(sessions: PapSession[]): PressureDwell {
  const dwellMs = new Map<number, number>()

  for (const session of sessions) {
    const channel = session.channels.find((candidate) => candidate.id === 'therapyPressure')
    if (!channel) continue

    for (const value of channel.values) {
      if (!Number.isFinite(value)) continue
      const bucket = Math.round(value * PRESSURE_BUCKETS_PER_UNIT)
      dwellMs.set(bucket, (dwellMs.get(bucket) ?? 0) + channel.intervalMs)
    }
  }

  const buckets = [...dwellMs.keys()].sort((a, b) => a - b)

  return {
    pressure: buckets.map((bucket) => bucket / PRESSURE_BUCKETS_PER_UNIT),
    minutes: buckets.map((bucket) => (dwellMs.get(bucket) ?? 0) / MINUTE_MS),
  }
}

/**
 * The mean of every sample the night recorded for a channel. The device stores a median, a 95th
 * percentile and a maximum but never a mean, so this is the only place one comes from.
 */
export function channelAverage(sessions: PapSession[], channelId: ChannelId): number | null {
  let total = 0
  let count = 0

  for (const session of sessions) {
    const channel = session.channels.find((candidate) => candidate.id === channelId)
    if (!channel) continue

    for (const value of channel.values) {
      if (!Number.isFinite(value)) continue
      total += value
      count += 1
    }
  }

  return count > 0 ? total / count : null
}

export function sessionDurationMs(sessions: PapSession[]): number {
  return sessions.reduce((total, session) => total + (session.endMs - session.startMs), 0)
}

export function allEvents(sessions: PapSession[]): PapEvent[] {
  return sessions.flatMap((session) => session.events)
}

export function truncateToTenth(value: number): number {
  return Math.trunc(value * 10) / 10
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}
