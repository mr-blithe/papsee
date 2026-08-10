import { describe, expect, it } from 'vitest'
import { buildEdf, type EdfSignalSpec } from '../edf/writer'
import { parseStr } from './str'

const AIRSENSE_10 = 37028
const AIRSENSE_11 = 39410

const DAY_SECONDS = 86400

function signal(label: string, physicalMax = 100, digitalMax = 100): EdfSignalSpec {
  return { label, unit: '', physicalMin: 0, physicalMax, digitalMin: 0, digitalMax, samplesPerRecord: 1 }
}

function strDay(values: Record<string, number>, modelNumber: number, scaled: Record<string, [number, number]> = {}) {
  const labels = Object.keys(values)
  const buffer = buildEdf({
    declaredRecordCount: '-1',
    recordDuration: DAY_SECONDS,
    signals: labels.map((label) => {
      const range = scaled[label]
      return range ? signal(label, range[0], range[1]) : signal(label)
    }),
    records: [labels.map((label) => [values[label]])],
  })

  return parseStr(buffer, modelNumber)[0]
}

describe('the pressure signals a mode actually uses', () => {
  it('reads the S9 AutoSet pressure range instead of reporting no range at all', () => {
    const day = strDay({ Mode: 1, 'S.AS.MinPress': 8, 'S.AS.MaxPress': 14 }, AIRSENSE_10)

    expect(day.settings.mode).toBe('AutoSet')
    expect(day.settings.minPressure).toBe(8)
    expect(day.settings.maxPressure).toBe(14)
  })

  it('reads the AutoSet for Her range from its own signals, not the plain AutoSet ones', () => {
    const day = strDay(
      { Mode: 11, 'S.A.MinPress': 4, 'S.A.MaxPress': 20, 'S.AFH.MinPress': 9, 'S.AFH.MaxPress': 12 },
      AIRSENSE_10,
    )

    expect(day.settings.mode).toBe('AutoSet for Her')
    expect(day.settings.minPressure).toBe(9)
    expect(day.settings.maxPressure).toBe(12)
  })

  it('reports no pressure for a bilevel night rather than the AutoSet signals it leaves behind', () => {
    const day = strDay({ Mode: 4, 'S.A.MinPress': 4, 'S.A.MaxPress': 20, 'S.C.Press': 11 }, AIRSENSE_11)

    expect(day.settings.mode).toBe('Bilevel Fixed')
    expect(day.settings.setPressure).toBeNull()
    expect(day.settings.minPressure).toBeNull()
    expect(day.settings.maxPressure).toBeNull()
    expect(day.settings.startPressure).toBeNull()
  })

  it('keeps reading a fixed CPAP pressure through the label the AirSense writes', () => {
    const day = strDay({ Mode: 3, 'S.C.Press': 11, 'S.C.StartPress': 6 }, AIRSENSE_11)

    expect(day.settings.mode).toBe('CPAP')
    expect(day.settings.setPressure).toBe(11)
    expect(day.settings.startPressure).toBe(6)
    expect(day.settings.minPressure).toBeNull()
  })
})

describe('the labels an S9 writes into STR.edf', () => {
  it('reads usage and mask events from the spaced S9 labels rather than reporting a night of zero', () => {
    const day = strDay({ Mode: 1, 'Mask Dur': 380, 'Mask Events': 5 }, AIRSENSE_10, { 'Mask Dur': [1440, 1440] })

    expect(day.summary.usageMinutes).toBe(380)
    expect(day.summary.maskEvents).toBe(5)
  })

  it('reads the S9 leak statistics and still converts them into litres per minute', () => {
    const day = strDay({ Mode: 1, 'Leak Med': 10, 'Leak Max': 50 }, AIRSENSE_10, {
      'Leak Med': [2, 100],
      'Leak Max': [2, 100],
    })

    expect(day.summary.leak.median).toBeCloseTo(12)
    expect(day.summary.leak.max).toBeCloseTo(60)
  })

  it('reads the S9 respiratory statistics through their spaced labels', () => {
    const day = strDay({ Mode: 1, 'RR Med': 14, 'Min Vent Med': 7, 'Tid Vol Med': 1 }, AIRSENSE_10, {
      'Tid Vol Med': [4, 200],
    })

    expect(day.summary.respiratoryRate.median).toBe(14)
    expect(day.summary.minuteVentilation.median).toBe(7)
    expect(day.summary.tidalVolume.median).toBeCloseTo(20)
  })

  it('reads the therapy mode from the localised label a non English device writes', () => {
    expect(strDay({ Mod: 3, 'S.C.Press': 9 }, AIRSENSE_11).settings.mode).toBe('CPAP')
    expect(strDay({ Modus: 1 }, AIRSENSE_10).settings.mode).toBe('AutoSet')
  })
})
