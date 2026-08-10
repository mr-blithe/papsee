import { deviceTime } from '../device-time'
import { parseEdf } from '../edf/header'
import { readAnnotations } from '../edf/annotations'
import { applyScaling, isAllNoData, readDigitalBytes, signalScaling } from '../edf/signals'
import type { DigitalChannel, DigitalSession } from '../digital'
import type { PapEvent, PapFile } from '../types'
import { isPeriodicBreathingEnd, lookupChannel, lookupEventType } from './channels'

const FILENAME = /^(\d{8})_(\d{6})_([A-Z0-9]+)\.edf$/i

interface DatalogFile {
  timestampMs: number
  kind: string
  file: PapFile
}

function parseFilename(path: string): { timestampMs: number; kind: string } | null {
  const name = path.split('/').pop() ?? ''
  const match = FILENAME.exec(name)
  if (!match) return null

  const [, date, time, kind] = match
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(4, 6))
  const day = Number(date.slice(6, 8))
  const hour = Number(time.slice(0, 2))
  const minute = Number(time.slice(2, 4))
  const second = Number(time.slice(4, 6))

  return {
    timestampMs: deviceTime(year, month, day, hour, minute, second).getTime(),
    kind: kind.toUpperCase(),
  }
}

function readChannels(file: PapFile, startMs: number): { channels: DigitalChannel[]; endMs: number } {
  const edf = parseEdf(file.data)
  const channels: DigitalChannel[] = []
  const durationMs = edf.recordCount * edf.recordDuration * 1000

  edf.signals.forEach((signal, index) => {
    const mapping = lookupChannel(signal.label)
    if (!mapping || edf.recordCount === 0) return

    const scaling = signalScaling(signal)
    const samples = readDigitalBytes(edf, index)

    // The no data marker is a physical -1 before the channel's own unit conversion, so an absent
    // oximeter has to be recognised on the unscaled reading.
    if (isAllNoData(applyScaling(samples, scaling))) return

    channels.push({
      id: mapping.id,
      unit: mapping.unit,
      intervalMs: (edf.recordDuration * 1000) / signal.samplesPerRecord,
      startMs,
      scale: scaling.scale * mapping.scale,
      offset: scaling.offset * mapping.scale,
      samples,
    })
  })

  return { channels, endMs: startMs + durationMs }
}

function readEvents(file: PapFile, startMs: number): PapEvent[] {
  const edf = parseEdf(file.data)
  const events: PapEvent[] = []
  let openPeriodicBreathing: PapEvent | null = null

  for (const annotation of readAnnotations(edf)) {
    const atMs = startMs + annotation.onset * 1000

    if (isPeriodicBreathingEnd(annotation.text)) {
      if (openPeriodicBreathing) openPeriodicBreathing.durationMs = atMs - openPeriodicBreathing.startMs
      openPeriodicBreathing = null
      continue
    }

    const type = lookupEventType(annotation.text)
    if (!type) continue

    const event: PapEvent = { type, startMs: atMs, durationMs: annotation.duration * 1000 }
    events.push(event)
    if (type === 'periodicBreathing') openPeriodicBreathing = event
  }

  return events
}

function mergeChannels(existing: DigitalChannel[], incoming: DigitalChannel[]): DigitalChannel[] {
  const merged = [...existing]
  for (const channel of incoming) {
    const index = merged.findIndex((candidate) => candidate.id === channel.id)
    if (index < 0) {
      merged.push(channel)
      continue
    }
    if (channel.intervalMs < merged[index].intervalMs) merged[index] = channel
  }
  return merged
}

export function buildSessions(files: PapFile[]): DigitalSession[] {
  const parsed: DatalogFile[] = []
  for (const file of files) {
    const info = parseFilename(file.path)
    if (!info) continue
    parsed.push({ ...info, file })
  }

  const waveformKinds = new Set(['BRP', 'PLD', 'SAD', 'SA2'])
  const starts = [
    ...new Set(parsed.filter((entry) => waveformKinds.has(entry.kind)).map((entry) => entry.timestampMs)),
  ].sort((a, b) => a - b)

  const sessions: DigitalSession[] = starts.map((startMs) => ({
    startMs,
    endMs: startMs,
    channels: [],
    events: [],
  }))

  for (const entry of parsed) {
    if (!waveformKinds.has(entry.kind)) continue
    const session = sessions.find((candidate) => candidate.startMs === entry.timestampMs)
    if (!session) continue
    const { channels, endMs } = readChannels(entry.file, entry.timestampMs)
    session.channels = mergeChannels(session.channels, channels)
    session.endMs = Math.max(session.endMs, endMs)
  }

  for (const entry of parsed) {
    if (entry.kind !== 'EVE' && entry.kind !== 'CSL') continue
    for (const event of readEvents(entry.file, entry.timestampMs)) {
      const containing = sessions.find(
        (candidate) => event.startMs >= candidate.startMs && event.startMs <= candidate.endMs,
      )
      const session = containing ?? sessions.findLast((candidate) => candidate.startMs <= event.startMs)
      if (session) session.events.push(event)
    }
  }

  for (const session of sessions) {
    session.events.sort((a, b) => a.startMs - b.startMs)
  }

  return sessions
}
