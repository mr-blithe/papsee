import { describe, expect, it } from 'vitest'
import { readAnnotations } from './annotations'
import { parseEdf } from './header'
import { buildEdf, type EdfSignalSpec } from './writer'

const latin1 = new TextDecoder('latin1')

function field(buffer: ArrayBuffer, offset: number, length: number): string {
  return latin1.decode(new Uint8Array(buffer, offset, length)).trim()
}

const FLOW: EdfSignalSpec = {
  label: 'Flow.40ms',
  unit: 'L/s',
  physicalMin: -1,
  physicalMax: 1,
  digitalMin: -1000,
  digitalMax: 1000,
  samplesPerRecord: 2,
}

const PRESSURE: EdfSignalSpec = {
  label: 'Press.40ms',
  unit: 'cmH2O',
  physicalMin: 0,
  physicalMax: 30,
  digitalMin: 0,
  digitalMax: 3000,
  samplesPerRecord: 3,
}

const ANNOTATIONS: EdfSignalSpec = {
  label: 'EDF Annotations',
  unit: '',
  physicalMin: -1,
  physicalMax: 1,
  digitalMin: -32768,
  digitalMax: 32767,
  samplesPerRecord: 32,
}

describe('the fixed header a device writes', () => {
  it('puts the declared record count at byte 236 and the record duration at 244', () => {
    const buffer = buildEdf({
      declaredRecordCount: '-1',
      recordDuration: 60,
      signals: [FLOW],
      records: [[[1, 2]]],
    })

    expect(field(buffer, 236, 8)).toBe('-1')
    expect(field(buffer, 244, 8)).toBe('60')
  })

  it('declares a header length that matches 256 bytes per signal plus the fixed block', () => {
    const buffer = buildEdf({
      declaredRecordCount: '1',
      recordDuration: 60,
      signals: [FLOW, PRESSURE],
      records: [
        [
          [1, 2],
          [3, 4, 5],
        ],
      ],
    })

    expect(field(buffer, 184, 8)).toBe('768')
    expect(field(buffer, 252, 4)).toBe('2')
  })

  it('starts the label column at byte 256, one 16 byte cell per signal', () => {
    const buffer = buildEdf({
      declaredRecordCount: '1',
      recordDuration: 60,
      signals: [FLOW, PRESSURE],
      records: [
        [
          [1, 2],
          [3, 4, 5],
        ],
      ],
    })

    expect(field(buffer, 256, 16)).toBe('Flow.40ms')
    expect(field(buffer, 272, 16)).toBe('Press.40ms')
  })

  it('carries the reserved field, so an annotation file can declare EDF+D', () => {
    const buffer = buildEdf({
      declaredRecordCount: '1',
      recordDuration: 0,
      reserved: 'EDF+D',
      signals: [ANNOTATIONS],
      records: [[{ annotations: [{ onset: 0, text: 'Recording starts' }] }]],
    })

    expect(field(buffer, 192, 44)).toBe('EDF+D')
    expect(parseEdf(buffer).reserved).toBe('EDF+D')
  })
})

describe('packing samples into a record', () => {
  it('interleaves signals within one record instead of concatenating whole signals', () => {
    const buffer = buildEdf({
      declaredRecordCount: '2',
      recordDuration: 60,
      signals: [FLOW, PRESSURE],
      records: [
        [
          [11, 12],
          [21, 22, 23],
        ],
        [
          [31, 32],
          [41, 42, 43],
        ],
      ],
    })

    const headerBytes = 256 * 3
    const samples = new Int16Array(buffer, headerBytes, 10)

    expect([...samples]).toEqual([11, 12, 21, 22, 23, 31, 32, 41, 42, 43])
  })

  it('writes samples little endian, which is the byte order the reader assumes', () => {
    const buffer = buildEdf({
      declaredRecordCount: '1',
      recordDuration: 60,
      signals: [{ ...FLOW, samplesPerRecord: 1 }],
      records: [[[258]]],
    })

    const bytes = new Uint8Array(buffer, 256 * 2, 2)

    expect([...bytes]).toEqual([2, 1])
  })
})

describe('annotation records', () => {
  it('writes a TAL the annotation reader recovers as onset, duration and text', () => {
    const buffer = buildEdf({
      declaredRecordCount: '1',
      recordDuration: 0,
      reserved: 'EDF+D',
      signals: [ANNOTATIONS],
      records: [
        [
          {
            annotations: [
              { onset: 0, text: 'Recording starts' },
              { onset: 132.5, duration: 14.2, text: 'Obstructive apnea' },
            ],
          },
        ],
      ],
    })

    expect(readAnnotations(parseEdf(buffer))).toEqual([
      { onset: 0, duration: 0, text: 'Recording starts' },
      { onset: 132.5, duration: 14.2, text: 'Obstructive apnea' },
    ])
  })

  it('separates onset from duration with 0x15 and text with 0x14, then terminates with a null', () => {
    const buffer = buildEdf({
      declaredRecordCount: '1',
      recordDuration: 0,
      reserved: 'EDF+D',
      signals: [{ ...ANNOTATIONS, samplesPerRecord: 16 }],
      records: [[{ annotations: [{ onset: 5, duration: 2, text: 'Hypopnea' }] }]],
    })

    const block = latin1.decode(new Uint8Array(buffer, 256 * 2, 32))

    expect(block.startsWith('+5\x152\x14Hypopnea\x14\x00')).toBe(true)
  })

  it('signs a positive onset with a leading plus, which EDF+ requires', () => {
    const buffer = buildEdf({
      declaredRecordCount: '1',
      recordDuration: 0,
      reserved: 'EDF+D',
      signals: [{ ...ANNOTATIONS, samplesPerRecord: 16 }],
      records: [[{ annotations: [{ onset: 12, text: 'RERA' }] }]],
    })

    const block = latin1.decode(new Uint8Array(buffer, 256 * 2, 32))

    expect(block.startsWith('+12\x14RERA\x14\x00')).toBe(true)
  })

  it('pads the rest of the annotation block with nulls so no stale text is read back', () => {
    const buffer = buildEdf({
      declaredRecordCount: '1',
      recordDuration: 0,
      reserved: 'EDF+D',
      signals: [{ ...ANNOTATIONS, samplesPerRecord: 16 }],
      records: [[{ annotations: [{ onset: 1, text: 'Apnea' }] }]],
    })

    const block = new Uint8Array(buffer, 256 * 2, 32)

    expect([...block.slice(-8)]).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('keeps each record independent, so an event lands in the record that declares it', () => {
    const buffer = buildEdf({
      declaredRecordCount: '2',
      recordDuration: 0,
      reserved: 'EDF+D',
      signals: [{ ...ANNOTATIONS, samplesPerRecord: 16 }],
      records: [[{ annotations: [{ onset: 1, text: 'Apnea' }] }], [{ annotations: [{ onset: 61, text: 'Hypopnea' }] }]],
    })

    expect(readAnnotations(parseEdf(buffer))).toEqual([
      { onset: 1, duration: 0, text: 'Apnea' },
      { onset: 61, duration: 0, text: 'Hypopnea' },
    ])
  })
})
