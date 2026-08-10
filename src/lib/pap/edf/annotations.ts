import { frameByteOffset, signalIndex, type EdfFile } from './header'

export interface EdfAnnotation {
  onset: number
  duration: number
  text: string
}

const ANNOTATION_LABEL = 'EDF Annotations'

const TAL_END = '\x00'
const TEXT_SEPARATOR = '\x14'
const DURATION_SEPARATOR = '\x15'

const decoder = new TextDecoder('latin1')

export function readAnnotations(edf: EdfFile): EdfAnnotation[] {
  const index = signalIndex(edf, ANNOTATION_LABEL)
  if (index < 0) return []

  const signal = edf.signals[index]
  const start = frameByteOffset(edf, index)
  const byteLength = signal.samplesPerRecord * 2
  const annotations: EdfAnnotation[] = []

  for (let record = 0; record < edf.recordCount; record += 1) {
    const base = edf.headerBytes + record * edf.frameBytes + start
    const block = decoder.decode(new Uint8Array(edf.data.buffer, edf.data.byteOffset + base, byteLength))

    for (const tal of block.split(TAL_END)) {
      if (!tal) continue
      const fields = tal.split(TEXT_SEPARATOR)
      const [onsetText, durationText] = fields[0].split(DURATION_SEPARATOR)
      const onset = Number.parseFloat(onsetText)
      if (!Number.isFinite(onset)) continue
      const duration = durationText ? Number.parseFloat(durationText) : 0

      for (const text of fields.slice(1)) {
        if (!text) continue
        annotations.push({ onset, duration: Number.isFinite(duration) ? duration : 0, text })
      }
    }
  }

  return annotations
}
