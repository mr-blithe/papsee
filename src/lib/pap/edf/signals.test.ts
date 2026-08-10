import { describe, expect, it } from 'vitest'
import { buildEdf, type EdfSignalSpec } from './writer'
import { parseEdf } from './header'
import { NO_DATA, applyScaling, isAllNoData, readDigitalBytes, readSignal, signalScaling } from './signals'

const SYMMETRIC: EdfSignalSpec = {
  label: 'Symmetric',
  unit: 'x',
  physicalMin: -100,
  physicalMax: 100,
  digitalMin: -1000,
  digitalMax: 1000,
  samplesPerRecord: 3,
}

const OFFSET: EdfSignalSpec = {
  label: 'Offset',
  unit: 'x',
  physicalMin: 0,
  physicalMax: 100,
  digitalMin: -1000,
  digitalMax: 1000,
  samplesPerRecord: 2,
}

describe('readSignal scaling', () => {
  it('scales digital samples into physical units', () => {
    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [SYMMETRIC],
        records: [[[0, 500, -1000]]],
      }),
    )

    const values = readSignal(edf, 0)

    expect(values[0]).toBeCloseTo(0, 5)
    expect(values[1]).toBeCloseTo(50, 5)
    expect(values[2]).toBeCloseTo(-100, 5)
  })

  it('applies the physical offset when the digital range is not centred on the physical range', () => {
    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [OFFSET],
        records: [[[-1000, 0]]],
      }),
    )

    const values = readSignal(edf, 0)

    expect(values[0]).toBeCloseTo(0, 5)
    expect(values[1]).toBeCloseTo(50, 5)
  })

  it('reads each signal from its own slot rather than a neighbour interleaved in the same record', () => {
    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [SYMMETRIC, OFFSET],
        records: [
          [
            [1000, 1000, 1000],
            [-1000, -1000],
          ],
        ],
      }),
    )

    expect(Array.from(readSignal(edf, 0))).toEqual([100, 100, 100])
    expect(Array.from(readSignal(edf, 1))).toEqual([0, 0])
  })

  it('concatenates samples across records in recording order', () => {
    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [OFFSET],
        records: [[[-1000, 0]], [[1000, 0]]],
      }),
    )

    expect(Array.from(readSignal(edf, 0))).toEqual([0, 50, 100, 50])
  })

  it('falls back to a gain of one when the header declares a zero width digital range', () => {
    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [{ ...OFFSET, digitalMin: 0, digitalMax: 0, physicalMin: 0, physicalMax: 0 }],
        records: [[[7, 9]]],
      }),
    )

    expect(Array.from(readSignal(edf, 0))).toEqual([7, 9])
  })
})

describe('isAllNoData', () => {
  it('reports a channel that is entirely the no data marker', () => {
    expect(isAllNoData(new Float32Array([NO_DATA, NO_DATA, NO_DATA]))).toBe(true)
  })

  it('keeps a channel that carries a single real sample among no data markers', () => {
    expect(isAllNoData(new Float32Array([NO_DATA, NO_DATA, 97, NO_DATA]))).toBe(false)
  })

  it('does not treat zero as the no data marker', () => {
    expect(isAllNoData(new Float32Array([0, 0]))).toBe(false)
  })
})

describe('splitting the read into digital bytes and a scaling', () => {
  const card = () =>
    parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        records: [
          [
            [-1000, 0, 1000],
            [-1000, 1000],
          ],
          [
            [500, -500, 250],
            [0, 500],
          ],
        ],
        signals: [SYMMETRIC, OFFSET],
      }),
    )

  it('recomposes readSignal exactly, so the split cannot drift from the original formula', () => {
    const edf = card()

    for (const index of [0, 1]) {
      const recomposed = applyScaling(readDigitalBytes(edf, index), signalScaling(edf.signals[index]))

      expect(Array.from(recomposed)).toEqual(Array.from(readSignal(edf, index)))
    }
  })

  it('returns the source bytes unchanged, so a wrong endianness cannot hide behind the scaling', () => {
    const edf = card()
    const digital = readDigitalBytes(edf, 0)
    const view = new DataView(digital.buffer, digital.byteOffset, digital.byteLength)

    expect(digital.byteLength).toBe(3 * 2 * 2)
    expect(view.getInt16(0, true)).toBe(-1000)
    expect(view.getInt16(2, true)).toBe(0)
    expect(view.getInt16(4, true)).toBe(1000)
    expect(view.getInt16(6, true)).toBe(500)
  })

  it('reads a signal that is not first in the frame at the right stride', () => {
    const edf = card()
    const digital = readDigitalBytes(edf, 1)
    const view = new DataView(digital.buffer, digital.byteOffset, digital.byteLength)

    expect(digital.byteLength).toBe(2 * 2 * 2)
    expect(view.getInt16(0, true)).toBe(-1000)
    expect(view.getInt16(2, true)).toBe(1000)
    expect(view.getInt16(4, true)).toBe(0)
    expect(view.getInt16(6, true)).toBe(500)
  })

  it('decodes the same values when the bytes sit at an odd offset, which an Int16Array view cannot do', () => {
    const edf = card()
    const digital = readDigitalBytes(edf, 0)
    const shifted = new Uint8Array(digital.byteLength + 1)
    shifted.set(digital, 1)

    expect(Array.from(applyScaling(shifted.subarray(1), signalScaling(edf.signals[0])))).toEqual(
      Array.from(readSignal(edf, 0)),
    )
  })

  it('keeps a scale no float32 can hold, so a stored channel decodes to the value it was parsed from', () => {
    const scaling = { scale: 0.12, offset: 0 }
    const digital = new Uint8Array(4)
    new DataView(digital.buffer).setInt16(0, 25, true)
    new DataView(digital.buffer).setInt16(2, -25, true)

    expect(Array.from(applyScaling(digital, scaling))).toEqual([Math.fround(25 * 0.12), Math.fround(-25 * 0.12)])
  })
})
