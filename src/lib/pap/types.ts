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

export interface StatSummary {
  median: number
  percentile95: number
  max: number
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
  mode: string
  setPressure: number | null
  minPressure: number | null
  maxPressure: number | null
  startPressure: number | null
  eprEnabled: string
  eprType: string
  eprLevel: number
  rampMode: string
  rampMinutes: number
  smartStart: string
  maskType: string
  antibacterialFilter: string
  humidifierEnabled: string
  humidifierLevel: number
  climateControl: string
  heatedTube: string
  tubeTemperature: number
  patientAccess: string
}

export interface DaySummary {
  usageMinutes: number
  maskEvents: number
  ahi: number
  ai: number
  hi: number
  oai: number
  cai: number
  uai: number
  reraIndex: number
  csrMinutes: number
  maskPressure: StatSummary
  leak: StatSummary
  minuteVentilation: StatSummary
  respiratoryRate: StatSummary
  tidalVolume: StatSummary
  targetEpap: StatSummary
  ambientHumidity: number
  humidifierTemperature: number
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
