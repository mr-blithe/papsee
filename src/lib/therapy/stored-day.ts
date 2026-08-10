import type { DigitalDay } from '@/lib/pap/digital'
import type { StoredDay } from './repository'

class MissingChannelError extends Error {}

/**
 * The stored night as the day payload frames it. Every channel carries its own block here, so the
 * header and the blocks that follow it cannot fall out of step: both are read off this one object.
 */
export function toDigitalDay(stored: StoredDay, samples: Map<string, Uint8Array>): DigitalDay {
  return {
    date: stored.date,
    startMs: stored.startMs,
    endMs: stored.endMs,
    summary: stored.summary,
    settings: stored.settings,
    sessions: stored.sessionBounds.map((bounds, sessionIndex) => ({
      startMs: bounds.startMs,
      endMs: bounds.endMs,
      events: stored.events
        .filter((event) => event.sessionIndex === sessionIndex)
        .map((event) => ({ type: event.type, startMs: event.startMs, durationMs: event.durationMs })),
      channels: stored.channels
        .filter((channel) => channel.sessionIndex === sessionIndex)
        .map((channel) => {
          const block = samples.get(channel.id)
          if (!block) throw new MissingChannelError(`${channel.channelId} of session ${sessionIndex} has no samples`)

          return {
            id: channel.channelId,
            unit: channel.unit,
            intervalMs: channel.intervalMs,
            startMs: channel.startMs,
            scale: channel.scale,
            offset: channel.offset,
            samples: block,
          }
        }),
    })),
  }
}
