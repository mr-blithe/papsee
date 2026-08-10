import type { CardBrand } from './detect'

/**
 * What a device reports about itself is English and stays English. Marking it up as such keeps a
 * browser from applying the reading locale's casing and a screen reader from sounding it out in the
 * wrong language.
 */
export const DEVICE_LANGUAGE = 'en'

export interface PapFile {
  path: string
  data: ArrayBuffer
}

export const CHANNEL_IDS = [
  'flow',
  'maskPressure',
  'therapyPressure',
  'expiratoryPressure',
  'leak',
  'respiratoryRate',
  'tidalVolume',
  'minuteVentilation',
  'snore',
  'flowLimitation',
  'pulse',
  'oxygenSaturation',
] as const

export type ChannelId = (typeof CHANNEL_IDS)[number]

export interface ChannelSeries {
  id: ChannelId
  unit: string
  intervalMs: number
  startMs: number
  values: Float32Array
}

export const PAP_EVENT_TYPES = [
  'obstructiveApnea',
  'centralApnea',
  'unclassifiedApnea',
  'apnea',
  'hypopnea',
  'rera',
  'periodicBreathing',
] as const

export type PapEventType = (typeof PAP_EVENT_TYPES)[number]

export interface PapEvent {
  type: PapEventType
  startMs: number
  durationMs: number
}

/**
 * What the card's own summary block says about one therapy day. Brand neutral: nothing here is
 * specific to how a given manufacturer stores it.
 */
export interface CardDaySummary {
  date: string
  noonMs: number
  summary: DaySummary
  settings: DaySettings
}

export interface PapSession {
  id: string
  startMs: number
  endMs: number
  channels: ChannelSeries[]
  events: PapEvent[]
}

export interface EventCounts {
  obstructiveApnea: number
  centralApnea: number
  unclassifiedApnea: number
  apnea: number
  hypopnea: number
  rera: number
}

export interface EventIndices extends EventCounts {
  ahi: number
  ai: number
  hi: number
  oai: number
  cai: number
  uai: number
  reraIndex: number
}

/** A reading the card never wrote is null. It is never zero, which is a value the device can also mean. */
export interface StatSummary {
  median: number | null
  percentile95: number | null
  max: number | null
}

export interface DeviceInfo {
  serialNumber: string
  productCode: string
  productName: string
  modelNumber: number
  regions: string[]
  hardwareIdentifier: string
  applicationIdentifier: string
  bootloaderIdentifier: string
  dataVersion: string
}

export interface SettingEntry {
  label: string
  value: string
}

export interface SettingGroup {
  title: string
  entries: SettingEntry[]
}

export interface DaySettings {
  mode: string | null
  setPressure: number | null
  minPressure: number | null
  maxPressure: number | null
  startPressure: number | null
  eprEnabled: string
  eprType: string
  eprLevel: number | null
  rampMode: string
  rampMinutes: number | null
  smartStart: string
  maskType: string
  antibacterialFilter: string
  humidifierEnabled: string
  humidifierLevel: number | null
  climateControl: string
  heatedTube: string
  tubeTemperature: number | null
  patientAccess: string
}

export interface DaySummary {
  usageMinutes: number | null
  maskEvents: number | null
  ahi: number | null
  ai: number | null
  hi: number | null
  oai: number | null
  cai: number | null
  uai: number | null
  reraIndex: number | null
  csrMinutes: number | null
  maskPressure: StatSummary
  leak: StatSummary
  minuteVentilation: StatSummary
  respiratoryRate: StatSummary
  tidalVolume: StatSummary
  targetEpap: StatSummary
  ambientHumidity: number | null
  humidifierTemperature: number | null
}

export interface PapDay {
  date: string
  startMs: number
  endMs: number
  sessions: PapSession[]
  summary: DaySummary | null
  settings: DaySettings | null
}

export interface PapImport {
  brand: CardBrand | null
  device: DeviceInfo | null
  settingGroups: SettingGroup[]
  days: PapDay[]
  unreadable: string[]
}
