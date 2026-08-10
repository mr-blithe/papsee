import { allEvents, eventIndices, sessionDurationMs, truncateToTenth } from '@/lib/pap'
import type { DaySettings, DaySummary, PapDay, PapEvent } from '@/lib/pap'

const MINUTE_MS = 60_000

export interface SessionBounds {
  startMs: number
  endMs: number
}

export interface DayIndexRow {
  date: string
  startMs: number
  endMs: number
  usageMinutes: number
  ahi: number
  oai: number
  cai: number
  hi: number
  reraIndex: number
  leakP95: number | null
  pressureP95: number | null
  summary: DaySummary | null
  settings: DaySettings | null
  sessionBounds: SessionBounds[]
  events: PapEvent[]
}

export function toDayIndexRow(day: PapDay): DayIndexRow {
  const events = allEvents(day.sessions)
  const recordedMs = sessionDurationMs(day.sessions)
  const computed = eventIndices(events, recordedMs)

  return {
    date: day.date,
    startMs: Math.round(day.startMs),
    endMs: Math.round(day.endMs),
    usageMinutes: day.summary?.usageMinutes ?? recordedMs / MINUTE_MS,
    ahi: day.summary?.ahi ?? truncateToTenth(computed.ahi),
    oai: day.summary?.oai ?? truncateToTenth(computed.oai),
    cai: day.summary?.cai ?? truncateToTenth(computed.cai),
    hi: day.summary?.hi ?? truncateToTenth(computed.hi),
    reraIndex: day.summary?.reraIndex ?? truncateToTenth(computed.reraIndex),
    leakP95: day.summary?.leak.percentile95 ?? null,
    pressureP95: day.summary?.maskPressure.percentile95 ?? null,
    summary: day.summary,
    settings: day.settings,
    sessionBounds: day.sessions.map((session) => ({
      startMs: Math.round(session.startMs),
      endMs: Math.round(session.endMs),
    })),
    events: events.map((event) => ({
      ...event,
      startMs: Math.round(event.startMs),
      durationMs: Math.round(event.durationMs),
    })),
  }
}
