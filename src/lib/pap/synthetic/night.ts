import type { UTCDate } from '@date-fns/utc'
import { addDays } from 'date-fns'
import { deviceTime, papDayKey } from '../device-time'
import { eventIndices, truncateToTenth } from '../stats'
import type { ChannelId, DaySettings, DaySummary, PapEvent, PapEventType, StatSummary } from '../types'

const NO_DATA = -1

const NOON_HOUR = 12
const DAY_MS = 86_400_000
const MINUTE_MS = 60_000
const MINUTES_PER_DAY = 1440

const INSPIRATORY_FRACTION = 0.4
const EXPIRATORY_PEAK_RATIO = 0.66
const RECOVERY_BREATHS = 2
const RECOVERY_GAIN = 1.8
const HYPOPNEA_GAIN = 0.4
const FLOW_LIMITED_GAIN = 0.78

const TREND_PERIOD_DAYS = 41

export interface SyntheticSession {
  startMs: number
  durationMs: number
}

export interface SyntheticNight {
  date: string
  noonMs: number
  sessions: SyntheticSession[]
  events: PapEvent[]
  settings: DaySettings
  summary: DaySummary
  sample(channel: ChannelId, atMs: number): number
}

interface Breath {
  startMs: number
  durationMs: number
  peakFlow: number
  tidalVolumeMl: number
  gain: number
}

interface Minute {
  leak: number
  pressure: number
  snore: number
  flowLimitation: number
}

function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(state: number): () => number {
  let value = state
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

function noonOf(date: string): UTCDate {
  const [year, month, day] = date.split('-').map(Number)
  return deviceTime(year, month, day, NOON_HOUR)
}

function shiftDayKey(date: string, days: number): string {
  return papDayKey(addDays(noonOf(date), days).getTime())
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0
  const position = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * fraction)))
  return sorted[position]
}

function statSummary(values: number[]): StatSummary {
  const sorted = [...values].sort((left, right) => left - right)
  return {
    median: round(percentile(sorted, 0.5), 2),
    percentile95: round(percentile(sorted, 0.95), 2),
    max: round(sorted[sorted.length - 1] ?? 0, 2),
  }
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function findIndexAt<T>(items: T[], atMs: number, startOf: (item: T) => number, endOf: (item: T) => number): number {
  let low = 0
  let high = items.length - 1
  while (low <= high) {
    const middle = (low + high) >> 1
    if (atMs < startOf(items[middle])) high = middle - 1
    else if (atMs >= endOf(items[middle])) low = middle + 1
    else return middle
  }
  return -1
}

function planSessions(random: () => number, noonMs: number): SyntheticSession[] {
  const shortNight = random() < 0.12
  const bedtimeMs = noonMs + (10.4 + random() * 1.9) * 3_600_000
  const totalMs = (shortNight ? 1.4 + random() * 2.2 : 6.1 + random() * 2.3) * 3_600_000
  const splits = shortNight ? 1 : 1 + Math.floor(random() * 3.4)

  const sessions: SyntheticSession[] = []
  let cursor = bedtimeMs
  let remaining = totalMs

  for (let index = 0; index < splits; index += 1) {
    const last = index === splits - 1
    const share = last ? remaining : remaining * (0.32 + random() * 0.42)
    const duration = Math.max(4 * MINUTE_MS, Math.round(share))
    sessions.push({ startMs: Math.round(cursor), durationMs: duration })
    remaining -= duration
    cursor += duration + Math.round((3 + random() * 22) * MINUTE_MS)
    if (remaining <= 4 * MINUTE_MS) break
  }

  const limit = noonMs + DAY_MS
  return sessions
    .map((session) => ({
      startMs: session.startMs,
      durationMs: Math.min(session.durationMs, limit - session.startMs),
    }))
    .filter((session) => session.durationMs >= MINUTE_MS && session.startMs < limit)
}

function eventTypeFor(random: () => number): PapEventType {
  const roll = random()
  if (roll < 0.4) return 'obstructiveApnea'
  if (roll < 0.72) return 'hypopnea'
  if (roll < 0.85) return 'rera'
  if (roll < 0.96) return 'centralApnea'
  return 'unclassifiedApnea'
}

function eventDuration(type: PapEventType, random: () => number): number {
  if (type === 'rera') return Math.round((10 + random() * 10) * 1000)
  if (type === 'hypopnea') return Math.round((10 + random() * 20) * 1000)
  return Math.round((10 + random() * 30) * 1000)
}

function planEvents(random: () => number, sessions: SyntheticSession[], targetAhi: number): PapEvent[] {
  const usageHours = sessions.reduce((total, session) => total + session.durationMs, 0) / 3_600_000
  const wanted = Math.round(targetAhi * usageHours * 1.28)
  const events: PapEvent[] = []

  for (const session of sessions) {
    const share = Math.round(
      (wanted * session.durationMs) /
        Math.max(
          1,
          sessions.reduce((t, s) => t + s.durationMs, 0),
        ),
    )
    const clusters = 1 + Math.floor(random() * 4)
    const centres = Array.from({ length: clusters }, () => 0.15 + random() * 0.8)
    const candidates: PapEvent[] = []

    for (let index = 0; index < share; index += 1) {
      const centre = centres[Math.floor(random() * centres.length)]
      const spread = (random() + random() + random() - 1.5) * 0.13
      const position = Math.min(0.985, Math.max(0.01, centre + spread))
      const type = eventTypeFor(random)
      const durationMs = eventDuration(type, random)
      const startMs = session.startMs + Math.round(position * (session.durationMs - durationMs))
      candidates.push({ type, startMs, durationMs })
    }

    candidates.sort((left, right) => left.startMs - right.startMs)

    let previousEnd = session.startMs
    for (const candidate of candidates) {
      if (candidate.startMs < previousEnd + 6000) continue
      if (candidate.startMs + candidate.durationMs > session.startMs + session.durationMs) continue
      events.push(candidate)
      previousEnd = candidate.startMs + candidate.durationMs
    }

    if (random() < 0.18) {
      const durationMs = Math.round((4 + random() * 9) * MINUTE_MS)
      const startMs = session.startMs + Math.round(random() * Math.max(0, session.durationMs - durationMs))
      events.push({ type: 'periodicBreathing', startMs, durationMs })
    }
  }

  return events.sort((left, right) => left.startMs - right.startMs)
}

function gainAt(events: PapEvent[], atMs: number): number {
  const covering = events.filter(
    (event) => event.type !== 'periodicBreathing' && atMs >= event.startMs && atMs < event.startMs + event.durationMs,
  )
  if (covering.length === 0) return 1
  if (covering.some((event) => event.type === 'hypopnea')) return HYPOPNEA_GAIN
  if (covering.some((event) => event.type === 'rera')) return FLOW_LIMITED_GAIN
  return 0
}

function planBreaths(
  random: () => number,
  sessions: SyntheticSession[],
  events: PapEvent[],
  tidalVolumeBase: number,
  rateBase: number,
): Breath[] {
  const breaths: Breath[] = []

  for (const session of sessions) {
    const baseRate = rateBase + (random() - 0.5) * 0.8
    const end = session.startMs + session.durationMs
    let cursor = session.startMs
    let recovery = 0

    while (cursor < end) {
      const drift = Math.sin((cursor - session.startMs) / 900_000) * 1.1
      const rate = Math.min(22, Math.max(9, baseRate + drift + (random() - 0.5) * 1.4))
      const durationMs = Math.round(60_000 / rate)
      if (cursor + durationMs > end) break

      const gain = gainAt(events, cursor + durationMs / 2)
      if (gain === 0) recovery = RECOVERY_BREATHS
      const boost = gain === 1 && recovery > 0 ? RECOVERY_GAIN : 1
      if (gain === 1 && recovery > 0) recovery -= 1

      const tidalVolumeMl = (tidalVolumeBase + (random() - 0.5) * 74) * gain * boost
      const peakFlow = (tidalVolumeMl / 1000) * rate * 3.1

      breaths.push({ startMs: cursor, durationMs, peakFlow, tidalVolumeMl, gain: gain * boost })
      cursor += durationMs
    }
  }

  return breaths
}

function planMinutes(
  random: () => number,
  noonMs: number,
  sessions: SyntheticSession[],
  events: PapEvent[],
  minPressure: number,
  maxPressure: number,
  leakBase: number,
  leaking: boolean,
): Minute[] {
  const minutes: Minute[] = Array.from({ length: MINUTES_PER_DAY }, () => ({
    leak: 0,
    pressure: 0,
    snore: 0,
    flowLimitation: 0,
  }))

  const excursions = Array.from({ length: leaking ? 1 + Math.floor(random() * 2) : 0 }, () => ({
    from: random(),
    span: 0.03 + random() * 0.09,
    height: 16 + random() * 26,
  }))

  for (const session of sessions) {
    const first = Math.floor((session.startMs - noonMs) / MINUTE_MS)
    const last = Math.min(MINUTES_PER_DAY - 1, Math.floor((session.startMs + session.durationMs - noonMs) / MINUTE_MS))

    for (let index = first; index <= last; index += 1) {
      const atMs = noonMs + index * MINUTE_MS
      const position = (atMs - session.startMs) / session.durationMs
      const nearby = events.filter(
        (event) => event.startMs > atMs - 4 * MINUTE_MS && event.startMs < atMs + 4 * MINUTE_MS,
      ).length

      const excursion = excursions.reduce(
        (total, item) => total + (Math.abs(position - item.from) < item.span ? item.height : 0),
        0,
      )

      const response = minPressure + Math.min(maxPressure - minPressure, nearby * 0.52) + Math.sin(index / 23) * 0.28

      minutes[index] = {
        leak: Math.max(0, leakBase + Math.sin(index / 7) * 1.4 + random() * 1.2 + excursion),
        pressure: Math.min(maxPressure, Math.max(minPressure, response)),
        snore: Math.min(1, nearby * 0.06 + random() * 0.05),
        flowLimitation: Math.min(1, nearby * 0.055 + random() * 0.04),
      }
    }
  }

  return minutes
}

export function planNight(seed: string, date: string): SyntheticNight {
  const noonMs = noonOf(date).getTime()
  const random = mulberry32(hashSeed(`${seed}:${date}`))
  const ordinal = Math.floor(noonMs / DAY_MS)

  const trend = Math.sin((ordinal / TREND_PERIOD_DAYS) * Math.PI * 2)
  const badNight = random() < 0.1
  const targetAhi = Math.max(0.4, 5.4 + trend * 4.2 + (random() - 0.5) * 3.4 + (badNight ? 9 + random() * 11 : 0))

  const sessions = planSessions(random, noonMs)
  const events = planEvents(random, sessions, targetAhi)

  const tidalVolumeBase = 380 + random() * 150
  const rateBase = 12.4 + random() * 4.2
  const breaths = planBreaths(random, sessions, events, tidalVolumeBase, rateBase)

  const minPressure = round(6.2 + random() * 1.8, 1)
  const maxPressure = round(minPressure + 5.4 + random() * 3.4, 1)
  const eprLevel = 1 + Math.floor(random() * 3)
  const leaking = random() < 0.2
  const leakBase = 2.4 + random() * 4.2
  const minutes = planMinutes(random, noonMs, sessions, events, minPressure, maxPressure, leakBase, leaking)

  const inSession = (atMs: number): boolean =>
    sessions.some((session) => atMs >= session.startMs && atMs < session.startMs + session.durationMs)

  const minuteAt = (atMs: number): Minute | null => {
    const index = Math.floor((atMs - noonMs) / MINUTE_MS)
    if (index < 0 || index >= MINUTES_PER_DAY) return null
    return minutes[index]
  }

  const breathAt = (atMs: number): Breath | null => {
    const index = findIndexAt(
      breaths,
      atMs,
      (breath) => breath.startMs,
      (breath) => breath.startMs + breath.durationMs,
    )
    return index < 0 ? null : breaths[index]
  }

  const sample = (channel: ChannelId, atMs: number): number => {
    if (channel === 'pulse' || channel === 'oxygenSaturation') return NO_DATA
    if (!inSession(atMs)) return NO_DATA

    const minute = minuteAt(atMs)
    const breath = breathAt(atMs)

    switch (channel) {
      case 'flow': {
        if (!breath) return 0
        const phase = (atMs - breath.startMs) / breath.durationMs
        const shape =
          phase < INSPIRATORY_FRACTION
            ? Math.sin((Math.PI * phase) / INSPIRATORY_FRACTION)
            : -EXPIRATORY_PEAK_RATIO * Math.sin((Math.PI * (phase - INSPIRATORY_FRACTION)) / (1 - INSPIRATORY_FRACTION))
        return round(breath.peakFlow * shape, 3)
      }
      case 'respiratoryRate':
        return breath ? round(60_000 / breath.durationMs, 2) : 0
      case 'tidalVolume':
        return breath ? round(breath.tidalVolumeMl, 1) : 0
      case 'minuteVentilation':
        return breath ? round((breath.tidalVolumeMl / 1000) * (60_000 / breath.durationMs), 2) : 0
      case 'therapyPressure':
        return minute ? round(minute.pressure, 2) : minPressure
      case 'expiratoryPressure':
        return minute ? round(Math.max(4, minute.pressure - eprLevel), 2) : minPressure
      case 'maskPressure': {
        if (!minute) return minPressure
        if (!breath) return round(minute.pressure, 2)
        const phase = (atMs - breath.startMs) / breath.durationMs
        const swing = phase < INSPIRATORY_FRACTION ? 0 : -eprLevel * 0.82
        return round(Math.max(4, minute.pressure + swing), 2)
      }
      case 'leak':
        return minute ? round(minute.leak, 2) : 0
      case 'snore':
        return minute ? round(minute.snore, 3) : 0
      case 'flowLimitation':
        return minute ? round(minute.flowLimitation, 3) : 0
    }
  }

  const recordedMs = sessions.reduce((total, session) => total + session.durationMs, 0)
  const indices = eventIndices(events, recordedMs)

  const activeMinutes = minutes.filter((_, index) => inSession(noonMs + index * MINUTE_MS + 1))
  const breathSamples = breaths.filter((breath) => breath.gain > 0.9)

  const csrMinutes = events
    .filter((event) => event.type === 'periodicBreathing')
    .reduce((total, event) => total + event.durationMs / MINUTE_MS, 0)

  const summary: DaySummary = {
    usageMinutes: round(recordedMs / MINUTE_MS, 1),
    maskEvents: sessions.length,
    ahi: truncateToTenth(indices.ahi),
    ai: truncateToTenth(indices.ai),
    hi: truncateToTenth(indices.hi),
    oai: truncateToTenth(indices.oai),
    cai: truncateToTenth(indices.cai),
    uai: truncateToTenth(indices.uai),
    reraIndex: truncateToTenth(indices.reraIndex),
    csrMinutes: round(csrMinutes, 1),
    maskPressure: statSummary(activeMinutes.map((minute) => minute.pressure)),
    leak: statSummary(activeMinutes.map((minute) => minute.leak)),
    minuteVentilation: statSummary(
      breathSamples.map((breath) => (breath.tidalVolumeMl / 1000) * (60_000 / breath.durationMs)),
    ),
    respiratoryRate: statSummary(breathSamples.map((breath) => 60_000 / breath.durationMs)),
    tidalVolume: statSummary(breathSamples.map((breath) => breath.tidalVolumeMl)),
    targetEpap: statSummary(activeMinutes.map((minute) => Math.max(4, minute.pressure - eprLevel))),
    ambientHumidity: round(38 + random() * 18, 1),
    humidifierTemperature: round(26 + random() * 4, 1),
  }

  const settings: DaySettings = {
    mode: 'AutoSet',
    setPressure: null,
    minPressure,
    maxPressure,
    startPressure: round(Math.max(4, minPressure - 2), 1),
    eprEnabled: 'On',
    eprType: 'Full Time',
    eprLevel,
    rampMode: 'Auto',
    rampMinutes: 0,
    smartStart: 'On',
    maskType: 'Full Face',
    antibacterialFilter: 'No',
    humidifierEnabled: 'On',
    humidifierLevel: 4,
    climateControl: 'Auto',
    heatedTube: 'On',
    tubeTemperature: 27,
    patientAccess: 'Advanced',
  }

  return { date, noonMs, sessions, events, settings, summary, sample }
}

export function planNights(seed: string, endDate: string, count: number): SyntheticNight[] {
  return Array.from({ length: count }, (_, index) => planNight(seed, shiftDayKey(endDate, index - (count - 1))))
}
