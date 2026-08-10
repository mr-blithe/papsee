import { format } from 'date-fns'
import { deviceTimeAt } from '../device-time'
import { buildEdf, type EdfAnnotationTal, type EdfRecordBlock, type EdfSignalSpec } from '../edf/writer'
import type { ChannelId, PapEventType, PapFile } from '../types'
import { planNight, type SyntheticNight, type SyntheticSession } from './night'

const MODEL_NUMBER = 39410

const SYNTHETIC_DEVICE = {
  serialNumber: '00000000001',
  productCode: String(MODEL_NUMBER),
  productName: 'AirSense11AutoSet',
  regions: 'EUR1,EUR2',
  hardwareIdentifier: 'SX000-0000',
  applicationIdentifier: 'SX000-0000',
  bootloaderIdentifier: 'SX000-0000',
  dataVersion: '1.0.0.0',
}

const NO_DATA = -1
const BRP_RECORD_SECONDS = 60
const PLD_RECORD_SECONDS = 60
const SA2_RECORD_SECONDS = 60
const BRP_INTERVAL_MS = 40
const PLD_INTERVAL_MS = 2000
const SA2_INTERVAL_MS = 1000
const UNKNOWN_RECORD_COUNT = '-1'

const EVENT_LABELS: Record<PapEventType, string> = {
  obstructiveApnea: 'Obstructive apnea',
  centralApnea: 'Central apnea',
  unclassifiedApnea: 'Unclassified apnea',
  apnea: 'Apnea',
  hypopnea: 'Hypopnea',
  rera: 'RERA',
  periodicBreathing: 'CSR Start',
}

interface WaveformSpec {
  spec: EdfSignalSpec
  channel: ChannelId
  scale: number
}

function signal(
  label: string,
  unit: string,
  physicalMin: number,
  physicalMax: number,
  digitalMax: number,
  samplesPerRecord: number,
): EdfSignalSpec {
  return { label, unit, physicalMin, physicalMax, digitalMin: 0, digitalMax, samplesPerRecord }
}

function toDigital(spec: EdfSignalSpec, physical: number): number {
  const digitalSpan = spec.digitalMax - spec.digitalMin
  const gain = digitalSpan === 0 ? 1 : (spec.physicalMax - spec.physicalMin) / digitalSpan
  const offset = spec.physicalMin - gain * spec.digitalMin
  const digital = Math.round((physical - offset) / gain)
  return Math.max(-32768, Math.min(32767, digital))
}

function stamp(atMs: number): { date: string; time: string; day: string; clock: string } {
  const at = deviceTimeAt(atMs)

  return {
    date: format(at, 'dd.MM.yy'),
    time: format(at, 'HH.mm.ss'),
    day: format(at, 'yyyyMMdd'),
    clock: format(at, 'HHmmss'),
  }
}

function waveformFile(
  night: SyntheticNight,
  session: SyntheticSession,
  kind: string,
  recordSeconds: number,
  intervalMs: number,
  waveforms: WaveformSpec[],
): PapFile {
  const samplesPerRecord = (recordSeconds * 1000) / intervalMs
  const records = Math.floor(session.durationMs / (recordSeconds * 1000))
  const specs = waveforms.map((waveform) => ({ ...waveform.spec, samplesPerRecord }))

  const blocks: EdfRecordBlock[][] = []
  for (let record = 0; record < records; record += 1) {
    const row: EdfRecordBlock[] = []
    waveforms.forEach((waveform, index) => {
      const samples: number[] = []
      for (let sample = 0; sample < samplesPerRecord; sample += 1) {
        const atMs = session.startMs + record * recordSeconds * 1000 + sample * intervalMs
        const physical = night.sample(waveform.channel, atMs)
        samples.push(physical === NO_DATA ? NO_DATA : toDigital(specs[index], physical * waveform.scale))
      }
      row.push(samples)
    })
    blocks.push(row)
  }

  const at = stamp(session.startMs)

  return {
    path: `DATALOG/${at.day}/${at.day}_${at.clock}_${kind}.edf`,
    data: buildEdf({
      startDate: at.date,
      startTime: at.time,
      declaredRecordCount: UNKNOWN_RECORD_COUNT,
      recordDuration: recordSeconds,
      signals: specs,
      records: blocks,
    }),
  }
}

function annotationFile(
  night: SyntheticNight,
  session: SyntheticSession,
  kind: string,
  types: PapEventType[],
): PapFile {
  const at = stamp(session.startMs)
  const talTable: EdfAnnotationTal[] = night.events
    .filter(
      (event) =>
        types.includes(event.type) &&
        event.startMs >= session.startMs &&
        event.startMs < session.startMs + session.durationMs,
    )
    .map((event) => ({
      onset: Math.round((event.startMs - session.startMs) / 100) / 10,
      duration: Math.round(event.durationMs / 100) / 10,
      text: EVENT_LABELS[event.type],
    }))

  const perRecord = 6
  const records: EdfRecordBlock[][] = []
  records.push([{ annotations: [{ onset: 0, text: 'Recording starts' }] }])
  for (let index = 0; index < talTable.length; index += perRecord) {
    records.push([{ annotations: talTable.slice(index, index + perRecord) }])
  }

  return {
    path: `DATALOG/${at.day}/${at.day}_${at.clock}_${kind}.edf`,
    data: buildEdf({
      startDate: at.date,
      startTime: at.time,
      declaredRecordCount: String(records.length),
      recordDuration: 0,
      reserved: 'EDF+D',
      signals: [signal('EDF Annotations', '', -1, 1, 1, 256)],
      records,
    }),
  }
}

const BRP_WAVEFORMS: WaveformSpec[] = [
  { spec: signal('Flow.40ms', 'L/s', -1, 1, 1000, 0), channel: 'flow', scale: 1 / 60 },
  { spec: signal('Press.40ms', 'cmH2O', 0, 25.5, 2550, 0), channel: 'maskPressure', scale: 1 },
]

const PLD_WAVEFORMS: WaveformSpec[] = [
  { spec: signal('Press.2s', 'cmH2O', 0, 25.5, 2550, 0), channel: 'therapyPressure', scale: 1 },
  { spec: signal('EprPress.2s', 'cmH2O', 0, 25.5, 2550, 0), channel: 'expiratoryPressure', scale: 1 },
  { spec: signal('Leak.2s', 'L/s', 0, 2, 2000, 0), channel: 'leak', scale: 1 / 60 },
  { spec: signal('RespRate.2s', 'bpm', 0, 50, 500, 0), channel: 'respiratoryRate', scale: 1 },
  { spec: signal('TidVol.2s', 'L', 0, 4, 4000, 0), channel: 'tidalVolume', scale: 1 / 1000 },
  { spec: signal('MinVent.2s', 'L/min', 0, 30, 3000, 0), channel: 'minuteVentilation', scale: 1 },
  { spec: signal('Snore.2s', '', 0, 1, 1000, 0), channel: 'snore', scale: 1 },
  { spec: signal('FlowLim.2s', '', 0, 1, 1000, 0), channel: 'flowLimitation', scale: 1 },
]

const SA2_WAVEFORMS: WaveformSpec[] = [
  {
    spec: {
      label: 'Pulse.1s',
      unit: 'bpm',
      physicalMin: -1,
      physicalMax: 254,
      digitalMin: -1,
      digitalMax: 254,
      samplesPerRecord: 0,
    },
    channel: 'pulse',
    scale: 1,
  },
  {
    spec: {
      label: 'SpO2.1s',
      unit: '%',
      physicalMin: -1,
      physicalMax: 254,
      digitalMin: -1,
      digitalMax: 254,
      samplesPerRecord: 0,
    },
    channel: 'oxygenSaturation',
    scale: 1,
  },
]

function identificationJson(): string {
  return JSON.stringify(
    {
      FlowGenerator: {
        IdentificationProfiles: {
          Product: {
            SerialNumber: SYNTHETIC_DEVICE.serialNumber,
            ProductCode: SYNTHETIC_DEVICE.productCode,
            ProductName: SYNTHETIC_DEVICE.productName,
            ProductGeographicIdentifier: SYNTHETIC_DEVICE.regions,
          },
          Hardware: { HardwareIdentifier: SYNTHETIC_DEVICE.hardwareIdentifier },
          Software: {
            ApplicationIdentifier: SYNTHETIC_DEVICE.applicationIdentifier,
            BootloaderIdentifier: SYNTHETIC_DEVICE.bootloaderIdentifier,
            DataModelVersionIdentifier: SYNTHETIC_DEVICE.dataVersion,
          },
        },
      },
    },
    null,
    2,
  )
}

function currentSettingsJson(night: SyntheticNight): string {
  return JSON.stringify(
    {
      FlowGenerator: {
        SettingProfiles: {
          ActiveProfiles: { TherapyProfile: 'Therapy', FeatureProfiles: ['Comfort', 'Humidifier', 'Mask'] },
          TherapyProfiles: {
            Therapy: {
              Mode: night.settings.mode,
              MinimumPressure: night.settings.minPressure,
              MaximumPressure: night.settings.maxPressure,
              StartPressure: night.settings.startPressure,
            },
          },
          FeatureProfiles: {
            Comfort: {
              ExpiratoryPressureRelief: night.settings.eprEnabled,
              ExpiratoryPressureReliefType: night.settings.eprType,
              ExpiratoryPressureReliefLevel: night.settings.eprLevel,
              Ramp: night.settings.rampMode,
              SmartStart: night.settings.smartStart,
            },
            Humidifier: {
              HumidifierEnable: night.settings.humidifierEnabled,
              HumidityLevel: night.settings.humidifierLevel,
              ClimateControl: night.settings.climateControl,
              TubeTemperature: night.settings.tubeTemperature,
            },
            Mask: { MaskType: night.settings.maskType, AntibacterialFilter: night.settings.antibacterialFilter },
          },
        },
      },
    },
    null,
    2,
  )
}

const STR_SCALES: Record<string, number> = { Leak: 1 / 60, TidVol: 1 / 1000 }

function strSignals(): EdfSignalSpec[] {
  const one = (label: string, physicalMax: number, digitalMax: number, samples = 1): EdfSignalSpec =>
    signal(label, '', 0, physicalMax, digitalMax, samples)

  const triplet = (prefix: string, physicalMax: number, digitalMax: number): EdfSignalSpec[] => [
    one(`${prefix}.50`, physicalMax, digitalMax),
    one(`${prefix}.95`, physicalMax, digitalMax),
    one(`${prefix}.Max`, physicalMax, digitalMax),
  ]

  return [
    one('MaskOn', 1440, 1440, 20),
    one('MaskOff', 1440, 1440, 20),
    one('Duration', 1440, 14400),
    one('MaskEvents', 100, 100),
    one('AHI', 200, 2000),
    one('AI', 200, 2000),
    one('HI', 200, 2000),
    one('OAI', 200, 2000),
    one('CAI', 200, 2000),
    one('UAI', 200, 2000),
    one('RIN', 200, 2000),
    one('CSR', 1440, 14400),
    ...triplet('MaskPress', 25.5, 2550),
    ...triplet('Leak', 2, 2000),
    ...triplet('MinVent', 30, 3000),
    ...triplet('RespRate', 50, 500),
    ...triplet('TidVol', 4, 4000),
    ...triplet('TgtEPAP', 25.5, 2550),
    one('AmbHumidity.50', 100, 1000),
    one('HumTemp.50', 50, 500),
    one('Mode', 16, 16),
    one('S.A.MinPress', 25.5, 2550),
    one('S.A.MaxPress', 25.5, 2550),
    one('S.A.StartPress', 25.5, 2550),
    one('S.EPR.EPREnable', 4, 4),
    one('S.EPR.ClinEnable', 4, 4),
    one('S.EPR.EPRType', 4, 4),
    one('S.EPR.Level', 4, 4),
    one('S.RampEnable', 4, 4),
    one('S.RampTime', 60, 60),
    one('S.SmartStart', 4, 4),
    one('S.Mask', 8, 8),
    one('S.ABFilter', 4, 4),
    one('S.HumEnable', 4, 4),
    one('S.HumLevel', 8, 8),
    one('S.ClimateControl', 4, 4),
    one('S.TempEnable', 4, 4),
    one('S.Temp', 40, 40),
    one('S.PtAccess', 4, 4),
  ]
}

function strRecord(night: SyntheticNight, signals: EdfSignalSpec[]): EdfRecordBlock[] {
  const summary = night.summary
  const settings = night.settings

  const maskOn = Array.from({ length: 20 }, (_, index) => {
    const session = night.sessions[index]
    return session ? Math.round((session.startMs - night.noonMs) / 60_000) : NO_DATA
  })
  const maskOff = Array.from({ length: 20 }, (_, index) => {
    const session = night.sessions[index]
    return session ? Math.round((session.startMs + session.durationMs - night.noonMs) / 60_000) : NO_DATA
  })

  const values: Record<string, number> = {
    Duration: summary.usageMinutes,
    MaskEvents: summary.maskEvents,
    AHI: summary.ahi,
    AI: summary.ai,
    HI: summary.hi,
    OAI: summary.oai,
    CAI: summary.cai,
    UAI: summary.uai,
    RIN: summary.reraIndex,
    CSR: summary.csrMinutes,
    'MaskPress.50': summary.maskPressure.median,
    'MaskPress.95': summary.maskPressure.percentile95,
    'MaskPress.Max': summary.maskPressure.max,
    'Leak.50': summary.leak.median,
    'Leak.95': summary.leak.percentile95,
    'Leak.Max': summary.leak.max,
    'MinVent.50': summary.minuteVentilation.median,
    'MinVent.95': summary.minuteVentilation.percentile95,
    'MinVent.Max': summary.minuteVentilation.max,
    'RespRate.50': summary.respiratoryRate.median,
    'RespRate.95': summary.respiratoryRate.percentile95,
    'RespRate.Max': summary.respiratoryRate.max,
    'TidVol.50': summary.tidalVolume.median,
    'TidVol.95': summary.tidalVolume.percentile95,
    'TidVol.Max': summary.tidalVolume.max,
    'TgtEPAP.50': summary.targetEpap.median,
    'TgtEPAP.95': summary.targetEpap.percentile95,
    'TgtEPAP.Max': summary.targetEpap.max,
    'AmbHumidity.50': summary.ambientHumidity,
    'HumTemp.50': summary.humidifierTemperature,
    Mode: 1,
    'S.A.MinPress': settings.minPressure ?? 0,
    'S.A.MaxPress': settings.maxPressure ?? 0,
    'S.A.StartPress': settings.startPressure ?? 0,
    'S.EPR.EPREnable': 2,
    'S.EPR.ClinEnable': 2,
    'S.EPR.EPRType': 2,
    'S.EPR.Level': settings.eprLevel,
    'S.RampEnable': 3,
    'S.RampTime': 0,
    'S.SmartStart': 2,
    'S.Mask': 3,
    'S.ABFilter': 1,
    'S.HumEnable': 2,
    'S.HumLevel': settings.humidifierLevel,
    'S.ClimateControl': 1,
    'S.TempEnable': 2,
    'S.Temp': settings.tubeTemperature,
    'S.PtAccess': 1,
  }

  return signals.map((spec) => {
    if (spec.label === 'MaskOn') return maskOn
    if (spec.label === 'MaskOff') return maskOff
    const prefix = spec.label.split('.')[0]
    const scale = STR_SCALES[prefix] ?? 1
    return [toDigital(spec, (values[spec.label] ?? 0) * scale)]
  })
}

export interface SyntheticCardOptions {
  seed: string
  dates: string[]
  waveforms?: boolean
}

export function writeSyntheticCard(options: SyntheticCardOptions): PapFile[] {
  const nights = options.dates.map((date) => planNight(options.seed, date))
  const signals = strSignals()
  const encoder = new TextEncoder()
  const first = stamp(nights[0].noonMs)

  const files: PapFile[] = [
    { path: 'Identification.json', data: encoder.encode(identificationJson()).slice().buffer },
    { path: 'SETTINGS/CurrentSettings.json', data: encoder.encode(currentSettingsJson(nights[0])).slice().buffer },
    {
      path: 'STR.edf',
      data: buildEdf({
        startDate: first.date,
        startTime: first.time,
        declaredRecordCount: UNKNOWN_RECORD_COUNT,
        recordDuration: 86400,
        signals,
        records: nights.map((night) => strRecord(night, signals)),
      }),
    },
  ]

  if (options.waveforms === false) return files

  for (const night of nights) {
    for (const session of night.sessions) {
      files.push(waveformFile(night, session, 'BRP', BRP_RECORD_SECONDS, BRP_INTERVAL_MS, BRP_WAVEFORMS))
      files.push(waveformFile(night, session, 'PLD', PLD_RECORD_SECONDS, PLD_INTERVAL_MS, PLD_WAVEFORMS))
      files.push(waveformFile(night, session, 'SA2', SA2_RECORD_SECONDS, SA2_INTERVAL_MS, SA2_WAVEFORMS))
      files.push(
        annotationFile(night, session, 'EVE', [
          'obstructiveApnea',
          'centralApnea',
          'unclassifiedApnea',
          'apnea',
          'hypopnea',
          'rera',
        ]),
      )
      files.push(annotationFile(night, session, 'CSL', ['periodicBreathing']))
    }
  }

  return files
}
