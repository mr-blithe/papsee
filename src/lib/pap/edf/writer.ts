export interface EdfSignalSpec {
  label: string
  unit: string
  physicalMin: number
  physicalMax: number
  digitalMin: number
  digitalMax: number
  samplesPerRecord: number
}

export interface EdfAnnotationTal {
  onset: number
  duration?: number
  text: string
}

export interface EdfAnnotationBlock {
  annotations: EdfAnnotationTal[]
}

export type EdfRecordBlock = number[] | EdfAnnotationBlock

export interface EdfSpec {
  startDate?: string
  startTime?: string
  declaredRecordCount: string
  recordDuration: number
  reserved?: string
  signals: EdfSignalSpec[]
  records: EdfRecordBlock[][]
}

const FIXED_HEADER_BYTES = 256

const TAL_END = '\x00'
const TEXT_SEPARATOR = '\x14'
const DURATION_SEPARATOR = '\x15'

const encoder = new TextEncoder()

function write(target: Uint8Array, offset: number, value: string, length: number): void {
  target.fill(0x20, offset, offset + length)
  target.set(encoder.encode(value).slice(0, length), offset)
}

function signedOnset(onset: number): string {
  return onset < 0 ? String(onset) : `+${onset}`
}

function talText(block: EdfAnnotationBlock): string {
  return block.annotations
    .map((entry) => {
      const head =
        entry.duration === undefined
          ? signedOnset(entry.onset)
          : `${signedOnset(entry.onset)}${DURATION_SEPARATOR}${entry.duration}`
      return `${head}${TEXT_SEPARATOR}${entry.text}${TEXT_SEPARATOR}${TAL_END}`
    })
    .join('')
}

export function buildEdf(spec: EdfSpec): ArrayBuffer {
  const signalCount = spec.signals.length
  const headerBytes = FIXED_HEADER_BYTES * (1 + signalCount)
  const samplesPerFrame = spec.signals.reduce((total, signal) => total + signal.samplesPerRecord, 0)
  const buffer = new ArrayBuffer(headerBytes + spec.records.length * samplesPerFrame * 2)
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)

  write(bytes, 0, '0', 8)
  write(bytes, 8, 'synthetic patient', 80)
  write(bytes, 88, 'synthetic recording', 80)
  write(bytes, 168, spec.startDate ?? '08.08.26', 8)
  write(bytes, 176, spec.startTime ?? '12.00.00', 8)
  write(bytes, 184, String(headerBytes), 8)
  write(bytes, 192, spec.reserved ?? '', 44)
  write(bytes, 236, spec.declaredRecordCount, 8)
  write(bytes, 244, String(spec.recordDuration), 8)
  write(bytes, 252, String(signalCount), 4)

  let cursor = FIXED_HEADER_BYTES
  const column = (length: number, pick: (signal: EdfSignalSpec) => string): void => {
    spec.signals.forEach((signal, index) => write(bytes, cursor + index * length, pick(signal), length))
    cursor += signalCount * length
  }

  column(16, (signal) => signal.label)
  column(80, () => '')
  column(8, (signal) => signal.unit)
  column(8, (signal) => String(signal.physicalMin))
  column(8, (signal) => String(signal.physicalMax))
  column(8, (signal) => String(signal.digitalMin))
  column(8, (signal) => String(signal.digitalMax))
  column(80, () => '')
  column(8, (signal) => String(signal.samplesPerRecord))
  column(32, () => '')

  spec.records.forEach((record, recordIndex) => {
    let sampleOffset = 0
    record.forEach((block, signalIndex) => {
      const base = headerBytes + (recordIndex * samplesPerFrame + sampleOffset) * 2

      if (Array.isArray(block)) {
        block.forEach((sample, sampleIndex) => view.setInt16(base + sampleIndex * 2, sample, true))
      } else {
        const byteLength = spec.signals[signalIndex].samplesPerRecord * 2
        bytes.fill(0, base, base + byteLength)
        bytes.set(encoder.encode(talText(block)).slice(0, byteLength), base)
      }

      sampleOffset += spec.signals[signalIndex].samplesPerRecord
    })
  })

  return buffer
}
