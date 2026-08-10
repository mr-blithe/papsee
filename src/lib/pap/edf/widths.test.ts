import { describe, expect, it } from 'vitest'
import { readAnnotations } from './annotations'
import { parseEdf, type EdfSignalHeader } from './header'
import { readSignal } from './signals'
import { buildEdf, type EdfSignalSpec } from './writer'

const EIGHT_BIT = '#1'
const SIXTEEN_BIT = '#2'

/** The Löwenstein sentinel rule, which belongs to that loader and not to the generic reader. */
function wmSampleWidth(reserved: string): 1 | 2 {
  return reserved === EIGHT_BIT ? 1 : 2
}

const UNSIGNED_BYTE: EdfSignalSpec = {
  label: 'Unsigned',
  unit: 'x',
  physicalMin: 0,
  physicalMax: 255,
  digitalMin: 0,
  digitalMax: 255,
  samplesPerRecord: 4,
  reserved: EIGHT_BIT,
  bytesPerSample: 1,
}

const SIGNED_BYTE: EdfSignalSpec = {
  label: 'Signed',
  unit: 'x',
  physicalMin: -128,
  physicalMax: 127,
  digitalMin: -128,
  digitalMax: 127,
  samplesPerRecord: 4,
  reserved: EIGHT_BIT,
  bytesPerSample: 1,
}

const WIDE: EdfSignalSpec = {
  label: 'Wide',
  unit: 'x',
  physicalMin: -100,
  physicalMax: 100,
  digitalMin: -1000,
  digitalMax: 1000,
  samplesPerRecord: 3,
  reserved: SIXTEEN_BIT,
}

describe('a device that writes some signals one byte wide', () => {
  it('reads an unsigned byte signal as the same physical values a two byte one would give', () => {
    const samples = [0, 1, 200, 255]
    const narrow = parseEdf(
      buildEdf({ declaredRecordCount: '-1', recordDuration: 1, signals: [UNSIGNED_BYTE], records: [[samples]] }),
      wmSampleWidth,
    )
    const wide = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [{ ...UNSIGNED_BYTE, reserved: SIXTEEN_BIT, bytesPerSample: 2 }],
        records: [[samples]],
      }),
    )

    expect([...readSignal(narrow, 0)]).toEqual([...readSignal(wide, 0)])
  })

  it('reads a byte below zero as negative, because the header declares the signal signed', () => {
    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [SIGNED_BYTE],
        records: [[[-128, -1, 0, 127]]],
      }),
      wmSampleWidth,
    )

    const values = readSignal(edf, 0)

    expect(values[0]).toBeCloseTo(-128, 5)
    expect(values[1]).toBeCloseTo(-1, 5)
    expect(values[3]).toBeCloseTo(127, 5)
  })

  it('counts records from the summed widths, because a byte signal costs half of what a wide one does', () => {
    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [UNSIGNED_BYTE, WIDE],
        records: [
          [
            [1, 2, 3, 4],
            [10, 20, 30],
          ],
          [
            [5, 6, 7, 8],
            [40, 50, 60],
          ],
        ],
      }),
      wmSampleWidth,
    )

    // Four one byte samples plus three two byte ones is ten bytes a record, not fourteen.
    expect(edf.frameBytes).toBe(10)
    expect(edf.recordCount).toBe(2)
  })

  it('finds a wide signal that follows a byte signal at the right offset, not half a sample out', () => {
    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '-1',
        recordDuration: 1,
        signals: [UNSIGNED_BYTE, WIDE],
        records: [
          [
            [1, 2, 3, 4],
            [1000, 0, -1000],
          ],
        ],
      }),
      wmSampleWidth,
    )

    const values = readSignal(edf, 1)

    expect(values[0]).toBeCloseTo(100, 5)
    expect(values[1]).toBeCloseTo(0, 5)
    expect(values[2]).toBeCloseTo(-100, 5)
  })

  it('still recovers the annotations of a file whose other signals are one byte wide', () => {
    const annotations: EdfSignalSpec = {
      label: 'EDF Annotations',
      unit: '',
      physicalMin: -1,
      physicalMax: 1,
      digitalMin: 0,
      digitalMax: 1,
      samplesPerRecord: 32,
      reserved: SIXTEEN_BIT,
    }

    const edf = parseEdf(
      buildEdf({
        declaredRecordCount: '2',
        recordDuration: 0,
        reserved: 'EDF+D',
        signals: [UNSIGNED_BYTE, annotations],
        records: [
          [[1, 2, 3, 4], { annotations: [{ onset: 0, text: 'Recording starts' }] }],
          [[5, 6, 7, 8], { annotations: [{ onset: 12, duration: 3, text: 'Obstructive apnea' }] }],
        ],
      }),
      wmSampleWidth,
    )

    const recovered = readAnnotations(edf)

    expect(recovered.map((entry) => entry.text)).toContain('Obstructive apnea')
    expect(recovered.find((entry) => entry.text === 'Obstructive apnea')?.onset).toBe(12)
  })

  it('leaves a file with no width rule two bytes a sample, so every ResMed card reads as before', () => {
    const edf = parseEdf(
      buildEdf({ declaredRecordCount: '-1', recordDuration: 1, signals: [WIDE], records: [[[1000, 0, -1000]]] }),
    )

    expect(edf.signals.every((signal: EdfSignalHeader) => signal.bytesPerSample === 2)).toBe(true)
    expect(edf.frameBytes).toBe(6)
  })
})
