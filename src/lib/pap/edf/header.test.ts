import { describe, expect, it } from 'vitest'
import { buildEdf, type EdfSignalSpec } from './writer'
import { frameByteOffset, parseEdf, signalIndex } from './header'

const FLOW: EdfSignalSpec = {
  label: 'Flow.40ms',
  unit: 'L/s',
  physicalMin: -1,
  physicalMax: 1,
  digitalMin: -32768,
  digitalMax: 32767,
  samplesPerRecord: 2,
}

const PRESSURE: EdfSignalSpec = {
  label: 'Press.2s',
  unit: 'cmH2O',
  physicalMin: 0,
  physicalMax: 25,
  digitalMin: 0,
  digitalMax: 250,
  samplesPerRecord: 1,
}

describe('parseEdf record count', () => {
  it('derives the record count from the file size when the header declares -1', () => {
    const buffer = buildEdf({
      declaredRecordCount: '-1',
      recordDuration: 1,
      signals: [FLOW],
      records: [[[1, 2]], [[3, 4]], [[5, 6]]],
    })

    expect(parseEdf(buffer).recordCount).toBe(3)
  })

  it('derives the record count from the file size when the header declares 0', () => {
    const buffer = buildEdf({
      declaredRecordCount: '0',
      recordDuration: 1,
      signals: [FLOW],
      records: [[[1, 2]], [[3, 4]]],
    })

    expect(parseEdf(buffer).recordCount).toBe(2)
  })

  it('ignores a declared record count that disagrees with the file size', () => {
    const buffer = buildEdf({
      declaredRecordCount: '99',
      recordDuration: 1,
      signals: [FLOW],
      records: [[[1, 2]], [[3, 4]]],
    })

    expect(parseEdf(buffer).recordCount).toBe(2)
  })

  it('reports no records when the file carries header only', () => {
    const buffer = buildEdf({
      declaredRecordCount: '-1',
      recordDuration: 1,
      signals: [FLOW],
      records: [],
    })

    expect(parseEdf(buffer).recordCount).toBe(0)
  })
})

describe('parseEdf header fields', () => {
  it('reads the signal table across multiple signals', () => {
    const buffer = buildEdf({
      declaredRecordCount: '-1',
      recordDuration: 2,
      signals: [FLOW, PRESSURE],
      records: [[[1, 2], [3]]],
    })

    const edf = parseEdf(buffer)

    expect(edf.signals.map((signal) => signal.label)).toEqual(['Flow.40ms', 'Press.2s'])
    expect(edf.signals[1].unit).toBe('cmH2O')
    expect(edf.signals[1].physicalMax).toBe(25)
    expect(edf.frameBytes).toBe(6)
    expect(edf.recordDuration).toBe(2)
  })

  it('resolves a two digit year at or above 85 into the twentieth century', () => {
    const buffer = buildEdf({
      startDate: '31.12.85',
      startTime: '23.45.10',
      declaredRecordCount: '-1',
      recordDuration: 1,
      signals: [FLOW],
      records: [[[0, 0]]],
    })

    const start = parseEdf(buffer).startTime

    expect(start.getFullYear()).toBe(1985)
    expect(start.getMonth()).toBe(11)
    expect(start.getDate()).toBe(31)
    expect(start.getHours()).toBe(23)
    expect(start.getMinutes()).toBe(45)
  })

  it('resolves a two digit year below 85 into the twenty first century', () => {
    const buffer = buildEdf({
      startDate: '08.08.26',
      startTime: '12.00.00',
      declaredRecordCount: '-1',
      recordDuration: 1,
      signals: [FLOW],
      records: [[[0, 0]]],
    })

    expect(parseEdf(buffer).startTime.getFullYear()).toBe(2026)
  })
})

describe('signal addressing', () => {
  it('locates a signal by its exact label and reports a miss as -1', () => {
    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [FLOW, PRESSURE],
        records: [[[1, 2], [3]]],
      }),
    )

    expect(signalIndex(edf, 'Press.2s')).toBe(1)
    expect(signalIndex(edf, 'Leak.2s')).toBe(-1)
  })

  it('offsets a signal by the samples of every signal before it', () => {
    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [FLOW, PRESSURE],
        records: [[[1, 2], [3]]],
      }),
    )

    expect(frameByteOffset(edf, 0)).toBe(0)
    expect(frameByteOffset(edf, 1)).toBe(FLOW.samplesPerRecord * 2)
  })
})

describe('a header written outside ASCII', () => {
  it('reads a localised signal label rather than mangling it into a name nothing matches', () => {
    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [{ ...FLOW, label: 'Sızıntı' }, PRESSURE],
        records: [[[1, 2], [3]]],
      }),
    )

    expect(edf.signals[0].label).toBe('Sızıntı')
    expect(signalIndex(edf, 'Sızıntı')).toBe(0)
  })
})
