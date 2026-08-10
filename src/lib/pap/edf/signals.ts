import { frameByteOffset, type EdfFile, type EdfSignalHeader } from './header'

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

/**
 * A signal's own samples, always two bytes each. A device that stores a signal in one byte is widened
 * here rather than anywhere below, so what is stored and what is charted have one shape. The widening
 * is lossless because `signalScaling` reads the declared physical and digital range, never the storage
 * width, and both `[0,255]` and `[-128,127]` fit an Int16 exactly.
 */
export function readDigitalBytes(edf: EdfFile, index: number): Uint8Array {
  const signal = edf.signals[index]
  const samples = signal.samplesPerRecord
  const bytesPerRecord = samples * 2
  const digital = new Uint8Array(edf.recordCount * bytesPerRecord)
  const start = frameByteOffset(edf, index)
  const source = new Uint8Array(edf.data.buffer, edf.data.byteOffset, edf.data.byteLength)

  if (signal.bytesPerSample === 2) {
    for (let record = 0; record < edf.recordCount; record += 1) {
      const base = edf.headerBytes + record * edf.frameBytes + start
      digital.set(source.subarray(base, base + bytesPerRecord), record * bytesPerRecord)
    }

    return digital
  }

  // A one byte signal is signed when its declared minimum is, which is the only thing that says so.
  const signed = signal.digitalMin < 0
  const widened = new DataView(digital.buffer)

  for (let record = 0; record < edf.recordCount; record += 1) {
    const base = edf.headerBytes + record * edf.frameBytes + start
    for (let i = 0; i < samples; i += 1) {
      const byte = source[base + i]
      widened.setInt16((record * samples + i) * 2, signed ? (byte << 24) >> 24 : byte, true)
    }
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
