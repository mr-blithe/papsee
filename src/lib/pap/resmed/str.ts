import { addDays } from 'date-fns'
import { papDayKey } from '../device-time'
import { parseEdf, signalIndex, type EdfFile } from '../edf/header'
import { readSignal } from '../edf/signals'
import type { CardDaySummary, DaySettings, DaySummary, StatSummary } from '../types'
import { enumDecoder, type EnumDecoder } from './enums'

const LEAK_TO_LITRES_PER_MINUTE = 60
const LITRES_TO_MILLILITRES = 1000

const MODE = ['Mode', 'Modus', 'Funktion', 'Mod', '模式']
const SET_PRESSURE = [
  'S.C.Press',
  'Set Pressure',
  'Eingest. Druck',
  'Ingestelde druk',
  'Pres. prescrite',
  'Inställt tryck',
  'Basıncı Ayarl',
  '设定压力',
]
const MIN_PRESSURE = [
  'S.A.MinPress',
  'S.AS.MinPress',
  'Min Pressure',
  'Min. Druck',
  'Min druk',
  'Pression min.',
  'Min tryck',
  'Min Basınç',
  '最小压力',
]
const MAX_PRESSURE = [
  'S.A.MaxPress',
  'S.AS.MaxPress',
  'Max Pressure',
  'Max. Druck',
  'Max druk',
  'Pression max.',
  'Max tryck',
  'Azami Basınç',
  '最大压力',
]
const EPR_LEVEL = ['S.EPR.Level', 'EPR Level', 'EPR-Stufe', 'EPR-niveau', 'Niveau EPR', 'EPR-nivå', 'EPR Düzeyi']
const EPR_MODE = ['EPR']
const EPR_TYPE = ['S.EPR.EPRType']
const EPR_ENABLE = ['S.EPR.EPREnable']
const EPR_CLINICAL_ENABLE = ['S.EPR.ClinEnable']
const MASK_ON = ['MaskOn', 'Mask On']
const MASK_OFF = ['MaskOff', 'Mask Off']

interface PressureLabels {
  set: string[] | null
  min: string[] | null
  max: string[] | null
  start: string[]
}

const PRESSURE_BY_MODE: Record<string, PressureLabels> = {
  CPAP: { set: SET_PRESSURE, min: null, max: null, start: ['S.C.StartPress'] },
  AutoSet: { set: null, min: MIN_PRESSURE, max: MAX_PRESSURE, start: ['S.A.StartPress', 'S.AS.StartPress'] },
  'AutoSet for Her': {
    set: null,
    min: ['S.AFH.MinPress'],
    max: ['S.AFH.MaxPress'],
    start: ['S.AFH.StartPress'],
  },
}

function statLabels(dotted: string, s9: string) {
  return {
    median: [`${dotted}.50`, `${s9} Med`],
    percentile95: [`${dotted}.95`, `${s9} 95`],
    max: [`${dotted}.Max`, `${s9} Max`],
  }
}

class StrReader {
  private readonly edf: EdfFile
  private readonly cache = new Map<number, Float32Array>()

  constructor(edf: EdfFile) {
    this.edf = edf
  }

  private index(labels: string[]): number {
    for (const label of labels) {
      const index = signalIndex(this.edf, label)
      if (index >= 0) return index
    }
    return -1
  }

  private values(index: number): Float32Array {
    let values = this.cache.get(index)
    if (!values) {
      values = readSignal(this.edf, index)
      this.cache.set(index, values)
    }

    return values
  }

  at(labels: string[], record: number): number | null {
    const index = this.index(labels)
    if (index < 0) return null

    const value = this.values(index)[record * this.edf.signals[index].samplesPerRecord]
    return Number.isFinite(value) ? value : null
  }

  samples(labels: string[], record: number): Float32Array | null {
    const index = this.index(labels)
    if (index < 0) return null

    const perRecord = this.edf.signals[index].samplesPerRecord
    const start = record * perRecord

    return this.values(index).subarray(start, start + perRecord)
  }
}

function hasMaskUse(reader: StrReader, record: number): boolean {
  const on = reader.samples(MASK_ON, record)
  const off = reader.samples(MASK_OFF, record)
  if (!on || !off) return true

  return on.some((start, slot) => start >= 0 && off[slot] >= 0 && start !== off[slot])
}

function stat(reader: StrReader, record: number, labels: ReturnType<typeof statLabels>, scale = 1): StatSummary {
  const scaled = (of: string[]) => {
    const value = reader.at(of, record)
    return value === null ? null : value * scale
  }

  return { median: scaled(labels.median), percentile95: scaled(labels.percentile95), max: scaled(labels.max) }
}

type EprSettings = Pick<DaySettings, 'eprEnabled' | 'eprType' | 'eprLevel'>

/**
 * The two generations spell exhale pressure relief differently and encode it differently. An
 * AirSense writes dotted signals: a type offset by one, plus a device enable and a clinician enable
 * that both have to be on. An S9 writes a bare `EPR` carrying the relief mode itself. Applying the
 * dotted gate to a card that has no dotted signals is what reported an S9 running relief as Off, so
 * the gate is read only when those signals are actually there.
 */
function readEpr(reader: StrReader, record: number, decode: EnumDecoder): EprSettings {
  const type = reader.at(EPR_TYPE, record)
  const enable = reader.at(EPR_ENABLE, record)
  const clinicalEnable = reader.at(EPR_CLINICAL_ENABLE, record)
  const level = reader.at(EPR_LEVEL, record)

  if (type !== null || enable !== null || clinicalEnable !== null) {
    const eprEnabled = decode.onOff(enable)
    const active = eprEnabled === 'On' && decode.onOff(clinicalEnable) === 'On'

    return { eprEnabled, eprType: active ? decode.eprType(type) : 'Off', eprLevel: active ? level : null }
  }

  const mode = reader.at(EPR_MODE, record)
  if (mode === null) return { eprEnabled: decode.onOff(null), eprType: decode.eprMode(null), eprLevel: null }

  const eprType = decode.eprMode(mode)
  const off = eprType === 'Off'

  return { eprEnabled: off ? 'Off' : 'On', eprType, eprLevel: off ? null : level }
}

function readSettings(reader: StrReader, record: number, modelNumber: number | null): DaySettings {
  const decode = enumDecoder(modelNumber)
  const rawMode = reader.at(MODE, record)
  const mode = rawMode === null ? null : decode.mode(rawMode)
  const pressures = mode === null ? null : (PRESSURE_BY_MODE[mode] ?? null)

  const rampMode = decode.rampMode(reader.at(['S.RampEnable'], record))

  return {
    mode,
    setPressure: pressures?.set ? reader.at(pressures.set, record) : null,
    minPressure: pressures?.min ? reader.at(pressures.min, record) : null,
    maxPressure: pressures?.max ? reader.at(pressures.max, record) : null,
    startPressure: pressures ? reader.at(pressures.start, record) : null,
    ...readEpr(reader, record, decode),
    rampMode,
    rampMinutes: rampMode === 'Auto' ? null : reader.at(['S.RampTime'], record),
    smartStart: decode.onOff(reader.at(['S.SmartStart'], record)),
    maskType: decode.mask(reader.at(['S.Mask'], record)),
    antibacterialFilter: decode.yesNo(reader.at(['S.ABFilter'], record)),
    humidifierEnabled: decode.onOff(reader.at(['S.HumEnable'], record)),
    humidifierLevel: reader.at(['S.HumLevel'], record),
    climateControl: decode.climateControl(reader.at(['S.ClimateControl'], record)),
    heatedTube: decode.onOffAuto(reader.at(['S.TempEnable'], record)),
    tubeTemperature: reader.at(['S.Temp'], record),
    patientAccess: decode.patientAccess(reader.at(['S.PtAccess'], record)),
  }
}

function readSummary(reader: StrReader, record: number): DaySummary {
  return {
    usageMinutes: reader.at(['Duration', 'Mask Dur'], record),
    maskEvents: reader.at(['MaskEvents', 'Mask Events'], record),
    ahi: reader.at(['AHI'], record),
    ai: reader.at(['AI'], record),
    hi: reader.at(['HI'], record),
    oai: reader.at(['OAI'], record),
    cai: reader.at(['CAI'], record),
    uai: reader.at(['UAI'], record),
    reraIndex: reader.at(['RIN'], record),
    csrMinutes: reader.at(['CSR'], record),
    maskPressure: stat(reader, record, statLabels('MaskPress', 'Mask Pres')),
    leak: stat(reader, record, statLabels('Leak', 'Leak'), LEAK_TO_LITRES_PER_MINUTE),
    minuteVentilation: stat(reader, record, statLabels('MinVent', 'Min Vent')),
    respiratoryRate: stat(reader, record, statLabels('RespRate', 'RR')),
    tidalVolume: stat(reader, record, statLabels('TidVol', 'Tid Vol'), LITRES_TO_MILLILITRES),
    targetEpap: stat(reader, record, statLabels('TgtEPAP', 'Exp Pres')),
    ambientHumidity: reader.at(['AmbHumidity.50'], record),
    humidifierTemperature: reader.at(['HumTemp.50'], record),
  }
}

export interface StrCalendar {
  days: CardDaySummary[]
  coveredDates: string[]
}

export function parseStr(buffer: ArrayBuffer, modelNumber: number | null): StrCalendar {
  const edf = parseEdf(buffer)
  const reader = new StrReader(edf)
  const days: CardDaySummary[] = []
  const coveredDates: string[] = []

  for (let record = 0; record < edf.recordCount; record += 1) {
    const noonMs = addDays(edf.startTime, record).getTime()
    const date = papDayKey(noonMs)
    coveredDates.push(date)

    if (!hasMaskUse(reader, record)) continue

    days.push({
      date,
      noonMs,
      summary: readSummary(reader, record),
      settings: readSettings(reader, record, modelNumber),
    })
  }

  return { days, coveredDates }
}
