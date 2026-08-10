import type { UTCDate } from '@date-fns/utc'
import { deviceTime } from '../device-time'

export interface EdfSignalHeader {
  label: string
  transducer: string
  unit: string
  physicalMin: number
  physicalMax: number
  digitalMin: number
  digitalMax: number
  prefiltering: string
  samplesPerRecord: number
  reserved: string
  bytesPerSample: 1 | 2
}

export interface EdfFile {
  version: string
  patient: string
  recording: string
  startTime: UTCDate
  headerBytes: number
  reserved: string
  recordCount: number
  recordDuration: number
  signals: EdfSignalHeader[]
  frameBytes: number
  data: DataView
}

/**
 * How many bytes one sample of a signal takes, decided from the signal's own reserved field. EDF says
 * two; a vendor extension that says otherwise passes its own rule in and owns it, so nothing about a
 * particular manufacturer leaks into this reader.
 */
export type EdfSampleWidth = (reserved: string) => 1 | 2

const TWO_BYTES: EdfSampleWidth = () => 2

const HEADER_FIXED_BYTES = 256

const latin1 = new TextDecoder('latin1')
const utf8 = new TextDecoder('utf-8', { fatal: true })

function text(view: DataView, offset: number, length: number): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length)
  try {
    return utf8.decode(bytes).trim()
  } catch {
    return latin1.decode(bytes).trim()
  }
}

function number(view: DataView, offset: number, length: number): number {
  const parsed = Number(text(view, offset, length))
  return Number.isFinite(parsed) ? parsed : 0
}

function parseStartTime(date: string, time: string): UTCDate {
  const [dd, mm, yy] = date.split('.').map(Number)
  const [hh, mi, ss] = time.split('.').map(Number)
  const year = yy >= 85 ? 1900 + yy : 2000 + yy
  return deviceTime(year, mm ?? 1, dd ?? 1, hh ?? 0, mi ?? 0, ss ?? 0)
}

export function parseEdf(buffer: ArrayBuffer, sampleWidth: EdfSampleWidth = TWO_BYTES): EdfFile {
  const view = new DataView(buffer)
  const headerBytes = number(view, 184, 8)
  const signalCount = number(view, 252, 4)

  let cursor = HEADER_FIXED_BYTES
  const readColumn = (length: number): string[] => {
    const values: string[] = []
    for (let i = 0; i < signalCount; i += 1) values.push(text(view, cursor + i * length, length))
    cursor += signalCount * length
    return values
  }

  const labels = readColumn(16)
  const transducers = readColumn(80)
  const units = readColumn(8)
  const physicalMins = readColumn(8).map(Number)
  const physicalMaxs = readColumn(8).map(Number)
  const digitalMins = readColumn(8).map(Number)
  const digitalMaxs = readColumn(8).map(Number)
  const prefilterings = readColumn(80)
  const samplesPerRecord = readColumn(8).map(Number)
  const reservedPerSignal = readColumn(32)

  const signals: EdfSignalHeader[] = labels.map((label, i) => ({
    label,
    transducer: transducers[i],
    unit: units[i],
    physicalMin: physicalMins[i],
    physicalMax: physicalMaxs[i],
    digitalMin: digitalMins[i],
    digitalMax: digitalMaxs[i],
    prefiltering: prefilterings[i],
    samplesPerRecord: samplesPerRecord[i],
    reserved: reservedPerSignal[i],
    bytesPerSample: sampleWidth(reservedPerSignal[i]),
  }))

  const frameBytes = signals.reduce((total, signal) => total + signal.samplesPerRecord * signal.bytesPerSample, 0)

  return {
    version: text(view, 0, 8),
    patient: text(view, 8, 80),
    recording: text(view, 88, 80),
    startTime: parseStartTime(text(view, 168, 8), text(view, 176, 8)),
    headerBytes,
    reserved: text(view, 192, 44),
    recordCount: frameBytes > 0 ? Math.floor((buffer.byteLength - headerBytes) / frameBytes) : 0,
    recordDuration: number(view, 244, 8),
    signals,
    frameBytes,
    data: view,
  }
}

export function signalIndex(edf: EdfFile, label: string): number {
  return edf.signals.findIndex((signal) => signal.label === label)
}

/** Where a signal's samples start inside one record, in bytes, since signals may be different widths. */
export function frameByteOffset(edf: EdfFile, index: number): number {
  let offset = 0
  for (let i = 0; i < index; i += 1) offset += edf.signals[i].samplesPerRecord * edf.signals[i].bytesPerSample
  return offset
}
