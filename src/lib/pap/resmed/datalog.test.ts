import { describe, expect, it } from 'vitest'
import { deviceTime } from '../device-time'
import { buildEdf, type EdfAnnotationTal, type EdfSignalSpec } from '../edf/writer'
import type { PapFile } from '../types'
import { buildSessions } from './datalog'

const DAY = '20260714'
const CLOCK = '223000'
const SESSION_START_MS = deviceTime(2026, 7, 14, 22, 30, 0).getTime()

const RECORD_SECONDS = 60
const SAMPLES_PER_RECORD = 1500

const FLOW: EdfSignalSpec = {
  label: 'Flow.40ms',
  unit: 'L/s',
  physicalMin: -1,
  physicalMax: 1,
  digitalMin: 0,
  digitalMax: 1000,
  samplesPerRecord: SAMPLES_PER_RECORD,
}

const ANNOTATION: EdfSignalSpec = {
  label: 'EDF Annotations',
  unit: '',
  physicalMin: -1,
  physicalMax: 1,
  digitalMin: 0,
  digitalMax: 1,
  samplesPerRecord: 256,
}

function waveform(): PapFile {
  const samples = Array.from({ length: SAMPLES_PER_RECORD }, () => 500)

  return {
    path: `DATALOG/${DAY}/${DAY}_${CLOCK}_BRP.edf`,
    data: buildEdf({
      startDate: '14.07.26',
      startTime: '22.30.00',
      declaredRecordCount: '-1',
      recordDuration: RECORD_SECONDS,
      signals: [FLOW],
      records: [[samples], [samples]],
    }),
  }
}

function annotations(...tals: EdfAnnotationTal[]): PapFile {
  return {
    path: `DATALOG/${DAY}/${DAY}_${CLOCK}_CSL.edf`,
    data: buildEdf({
      startDate: '14.07.26',
      startTime: '22.30.00',
      declaredRecordCount: '2',
      recordDuration: 0,
      reserved: 'EDF+D',
      signals: [ANNOTATION],
      records: [[{ annotations: [{ onset: 0, text: 'Recording starts' }] }], [{ annotations: tals }]],
    }),
  }
}

function periodicBreathing(...tals: EdfAnnotationTal[]) {
  const [session] = buildSessions([waveform(), annotations(...tals)])
  return session.events.filter((event) => event.type === 'periodicBreathing')
}

describe('how long a run of periodic breathing lasted', () => {
  it('measures it from the start and end flags the device wrote around it', () => {
    const events = periodicBreathing({ onset: 10, text: 'CSR Start' }, { onset: 40, text: 'CSR End' })

    expect(events).toHaveLength(1)
    expect(events[0].startMs).toBe(SESSION_START_MS + 10_000)
    expect(events[0].durationMs).toBe(30_000)
  })

  it('keeps a duration the start flag carried itself, for a card that writes no end flag', () => {
    const events = periodicBreathing({ onset: 10, duration: 25, text: 'CSR Start' })

    expect(events).toHaveLength(1)
    expect(events[0].durationMs).toBe(25_000)
  })

  it('prefers the measured span over a duration the start flag also carried', () => {
    const events = periodicBreathing({ onset: 10, duration: 5, text: 'CSR Start' }, { onset: 40, text: 'CSR End' })

    expect(events[0].durationMs).toBe(30_000)
  })

  it('pairs each run with its own end flag rather than closing them all on the last one', () => {
    const events = periodicBreathing(
      { onset: 10, text: 'CSR Start' },
      { onset: 40, text: 'CSR End' },
      { onset: 70, text: 'CSR Start' },
      { onset: 100, text: 'CSR End' },
    )

    expect(events.map((event) => event.durationMs)).toEqual([30_000, 30_000])
  })

  it('scores nothing at all for an end flag whose start was never written', () => {
    expect(periodicBreathing({ onset: 40, text: 'CSR End' })).toEqual([])
  })
})
