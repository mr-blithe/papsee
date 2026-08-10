import { frameOffset, type EdfFile, type EdfSignalHeader } from './header'

export const NO_DATA = -1

export interface SignalScaling {
  scale: number
  offset: number
}

export function signalScaling(signal: EdfSignalHeader): SignalScaling {
  const digitalSpan = signal.digitalMax - signal.digitalMin
  const scale = digitalSpan === 0 ? 1 : (signal.physicalMax - signal.physicalMin) / digitalSpan

  return { scale, offset: signal.physicalMin - scale * signal.digitalMin }
}

export function readDigitalBytes(edf: EdfFile, index: number): Uint8Array {
  const samples = edf.signals[index].samplesPerRecord
  const bytesPerRecord = samples * 2
  const digital = new Uint8Array(edf.recordCount * bytesPerRecord)
  const start = frameOffset(edf, index) * 2
  const source = new Uint8Array(edf.data.buffer, edf.data.byteOffset, edf.data.byteLength)

  for (let record = 0; record < edf.recordCount; record += 1) {
    const base = edf.headerBytes + record * edf.samplesPerFrame * 2 + start
    digital.set(source.subarray(base, base + bytesPerRecord), record * bytesPerRecord)
  }

  return digital
}

export function applyScaling(digital: Uint8Array, scaling: SignalScaling): Float32Array {
  const count = digital.byteLength >> 1
  const view = new DataView(digital.buffer, digital.byteOffset, digital.byteLength)
  const values = new Float32Array(count)

  for (let i = 0; i < count; i += 1) {
    values[i] = view.getInt16(i * 2, true) * scaling.scale + scaling.offset
  }

  return values
}

export function readSignal(edf: EdfFile, index: number): Float32Array {
  return applyScaling(readDigitalBytes(edf, index), signalScaling(edf.signals[index]))
}

export function isAllNoData(values: Float32Array): boolean {
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] !== NO_DATA) return false
  }
  return true
}
