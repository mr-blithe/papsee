import { papDayKey } from '../device-time'
import { parseEdf, parseEdfStartTime, type EdfFile, type EdfSignalHeader } from '../edf/header'
import { isAllNoData, readDigitalBytes, signalScaling } from '../edf/signals'
import { applyScaling } from '../edf/signals'
import { parsePrismaEvents } from './events'
import type { DigitalChannel, DigitalSession } from '../digital'
import type { CardFileHead } from '../loaders'
import type { ChannelId, PapFile } from '../types'

const SIGNAL_FILE = /(^|\/)signal_(\d+)\.wmedf$/i
const EVENT_FILE = /(^|\/)event_(\d+)\.xml$/i

const EIGHT_BIT = '#1'
const SECONDS_PER_MINUTE = 60

/** The one deviation WMEDF makes from EDF: a per-signal sentinel saying how wide a sample is. */
function wmSampleWidth(reserved: string): 1 | 2 {
  return reserved === EIGHT_BIT ? 1 : 2
}

const CHANNELS: Record<string, ChannelId> = {
  RespFlow: 'flow',
  Pressure: 'maskPressure',
  LeakFlowBreath: 'leak',
  IPAP: 'therapyPressure',
  EPAP: 'expiratoryPressure',
}

/**
 * PapSee stores leak in litres per second and the device labels its own unit, so the header decides the
 * conversion rather than a constant copied from somewhere. Nothing else this brand writes needs one.
 */
function unitConversion(id: ChannelId, unit: string): { unit: string; scale: number } {
  const perMinute = /min/i.test(unit)
  if (id === 'leak' && perMinute) return { unit: 'L/s', scale: 1 / SECONDS_PER_MINUTE }

  return { unit, scale: 1 }
}

function keyOf(path: string, match: RegExpExecArray): string {
  const directory = path.slice(0, path.length - (match[0].length - (match[1]?.length ?? 0)))
  return `${directory}#${match[2]}`
}

/** A file's session key, which is its directory and its id together. */
function sessionKey(path: string): { key: string; kind: 'signal' | 'event' } | null {
  const signal = SIGNAL_FILE.exec(path)
  if (signal) return { key: keyOf(path, signal), kind: 'signal' }

  const event = EVENT_FILE.exec(path)
  if (event) return { key: keyOf(path, event), kind: 'event' }

  return null
}

function startOf(edf: EdfFile): number {
  return edf.startTime.getTime()
}

/**
 * Which therapy night each file belongs to. The day directory naming is unknown and OSCAR never reads
 * it, so the only honest source is the waveform header's own clock; an event file has no absolute clock
 * at all and takes the day of the waveform beside it. If it came back unassigned, every scored event on
 * the card would be dropped while the waveforms imported perfectly.
 */
export function assignPrismaDays(entries: CardFileHead[]): Map<string, string | null> {
  const dayByKey = new Map<string, string>()

  for (const entry of entries) {
    const found = sessionKey(entry.path)
    if (!found || found.kind !== 'signal') continue

    const at = parseEdfStartTime(entry.head)
    if (at) dayByKey.set(found.key, papDayKey(at.getTime()))
  }

  const assignment = new Map<string, string | null>()
  for (const entry of entries) {
    const found = sessionKey(entry.path)
    assignment.set(entry.path, found ? (dayByKey.get(found.key) ?? null) : null)
  }

  return assignment
}

function toChannel(edf: EdfFile, index: number, signal: EdfSignalHeader, startMs: number): DigitalChannel | null {
  const id = CHANNELS[signal.label]
  if (!id) return null

  // A signal that declares no samples or no record length would put Infinity into the stored interval.
  if (signal.samplesPerRecord <= 0 || edf.recordDuration <= 0) return null

  const scaling = signalScaling(signal)
  const converted = unitConversion(id, signal.unit)
  const samples = readDigitalBytes(edf, index)

  if (isAllNoData(applyScaling(samples, scaling))) return null

  return {
    id,
    unit: converted.unit,
    intervalMs: (edf.recordDuration * 1000) / signal.samplesPerRecord,
    startMs,
    scale: scaling.scale * converted.scale,
    offset: scaling.offset * converted.scale,
    samples,
  }
}

/**
 * One night of a Prisma card. A session is a waveform file and the event file beside it; the events are
 * anchored to the waveform's clock, because their own times are offsets from it.
 */
export function buildPrismaSessions(files: PapFile[]): DigitalSession[] {
  const signals = new Map<string, PapFile>()
  const events = new Map<string, PapFile>()

  for (const file of files) {
    const found = sessionKey(file.path)
    if (!found) continue
    if (found.kind === 'signal') signals.set(found.key, file)
    else events.set(found.key, file)
  }

  const sessions: DigitalSession[] = []

  for (const [key, file] of signals) {
    const edf = parseEdf(file.data, wmSampleWidth)
    const startMs = startOf(edf)
    const channels: DigitalChannel[] = []

    edf.signals.forEach((signal, index) => {
      const channel = toChannel(edf, index, signal, startMs)
      if (channel) channels.push(channel)
    })

    const eventFile = events.get(key)
    const scored = eventFile ? parsePrismaEvents(new TextDecoder().decode(eventFile.data), startMs) : null

    sessions.push({
      startMs,
      endMs: startMs + edf.recordCount * edf.recordDuration * 1000,
      channels,
      events: scored?.events ?? [],
    })
  }

  return sessions.sort((a, b) => a.startMs - b.startMs)
}

/** The parameter block of the first session of a night, which is what the device was running on it. */
export function readNightParameters(files: PapFile[]): Map<number, number> {
  const eventFiles = files.filter((file) => EVENT_FILE.test(file.path)).sort((a, b) => a.path.localeCompare(b.path))

  for (const file of eventFiles) {
    const { parameters } = parsePrismaEvents(new TextDecoder().decode(file.data), 0)
    if (parameters.size > 0) return parameters
  }

  return new Map()
}
