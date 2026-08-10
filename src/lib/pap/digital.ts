import { applyScaling } from './edf/signals'
import type { ChannelId, ChannelSeries, DaySettings, DaySummary, PapDay, PapEvent, PapSession } from './types'

/**
 * A channel as the device recorded it: the raw little endian Int16 samples plus the one linear
 * mapping that turns them into physical units. Storing the digital form keeps what is written and
 * what is read back identical by construction rather than by two formulas agreeing.
 */
export interface DigitalChannel {
  id: ChannelId
  unit: string
  intervalMs: number
  startMs: number
  scale: number
  offset: number
  samples: Uint8Array
}

export interface DigitalSession {
  startMs: number
  endMs: number
  channels: DigitalChannel[]
  events: PapEvent[]
}

export interface DigitalDay {
  date: string
  startMs: number
  endMs: number
  sessions: DigitalSession[]
  summary: DaySummary | null
  settings: DaySettings | null
}

function toChannelSeries(channel: DigitalChannel): ChannelSeries {
  return {
    id: channel.id,
    unit: channel.unit,
    intervalMs: channel.intervalMs,
    startMs: channel.startMs,
    values: applyScaling(channel.samples, { scale: channel.scale, offset: channel.offset }),
  }
}

function toPapSession(session: DigitalSession): PapSession {
  return {
    id: String(session.startMs),
    startMs: session.startMs,
    endMs: session.endMs,
    channels: session.channels.map(toChannelSeries),
    events: session.events,
  }
}

export function toPapDay(day: DigitalDay): PapDay {
  return {
    date: day.date,
    startMs: day.startMs,
    endMs: day.endMs,
    sessions: day.sessions.map(toPapSession),
    summary: day.summary,
    settings: day.settings,
  }
}
