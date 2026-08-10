import type { SettingEntry, SettingGroup } from '../types'

interface SettingsDocument {
  FlowGenerator?: {
    SettingProfiles?: {
      Attributes?: { AppliedDateTime?: string }
      ActiveProfiles?: { TherapyProfile?: string; FeatureProfiles?: string[] }
      TherapyProfiles?: Record<string, Record<string, unknown>>
      FeatureProfiles?: Record<string, Record<string, unknown>>
    }
  }
}

const WORDS: Record<string, string> = {
  CPAP: 'CPAP',
  AutoSet: 'AutoSet',
  HerAuto: 'AutoSet for Her',
  FullTime: 'Full Time',
  RampOnly: 'Ramp Only',
  FullFace: 'Full Face',
  NotAnswered: 'Not answered',
  ResMed: 'ResMed',
  MyAir: 'myAir',
}

const UNITS: Record<string, string> = {
  MaxPressure: 'cmH2O',
  MinPressure: 'cmH2O',
  SetPressure: 'cmH2O',
  StartPressure: 'cmH2O',
  EprPressure: 'cmH2O',
  RampTime: 'min',
  HeatedTubeTemperature: '°C',
}

const GROUP_TITLES: Record<string, string> = {
  EprFeature: 'Expiratory pressure relief',
  AutoRampFeature: 'Ramp',
  SmartStartStopFeature: 'Smart start and stop',
  CircuitFeature: 'Mask and circuit',
  ClimateFeature: 'Humidification and climate',
  MaskSenseFeature: 'Mask sense',
  PatientViewFeature: 'Device display',
  TemperatureFeature: 'Units',
  TimeZoneFeature: 'Time zone',
  LanguageFeature: 'Language',
  ComfortFeature: 'Comfort',
  CareCheckFeature: 'Care check',
  DeviceHealthFeature: 'Device health',
  UserSolutionFeature: 'Personalisation',
  DisplayFeature: 'Display',
  ReminderFeature: 'Reminders',
}

const HIDDEN_KEYS = new Set(['LanguageConfiguration'])

const ACRONYMS = new Set(['AHI', 'EPR'])

function humanise(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
    .split(' ')
    .map((word) => (ACRONYMS.has(word.toUpperCase()) ? word.toUpperCase() : word))
    .join(' ')
}

function formatValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return null
  const unit = UNITS[key]
  if (typeof value === 'number') return unit ? `${value} ${unit}` : String(value)
  const text = WORDS[String(value)] ?? humanise(String(value))
  return unit ? `${text} ${unit}` : text
}

function entriesFrom(profile: Record<string, unknown>): SettingEntry[] {
  const entries: SettingEntry[] = []
  for (const [key, value] of Object.entries(profile)) {
    if (HIDDEN_KEYS.has(key)) continue
    const formatted = formatValue(key, value)
    if (formatted === null) continue
    entries.push({ label: humanise(key), value: formatted })
  }
  return entries
}

export function parseCurrentSettings(json: string): SettingGroup[] {
  let document: SettingsDocument
  try {
    document = JSON.parse(json) as SettingsDocument
  } catch {
    return []
  }

  const profiles = document.FlowGenerator?.SettingProfiles
  if (!profiles) return []

  const groups: SettingGroup[] = []
  const activeTherapy = profiles.ActiveProfiles?.TherapyProfile
  const therapy = activeTherapy ? profiles.TherapyProfiles?.[activeTherapy] : undefined

  if (therapy) {
    groups.push({ title: 'Therapy', entries: entriesFrom(therapy) })
  }

  for (const name of profiles.ActiveProfiles?.FeatureProfiles ?? []) {
    const feature = profiles.FeatureProfiles?.[name]
    if (!feature) continue
    const entries = entriesFrom(feature)
    if (entries.length === 0) continue
    groups.push({ title: GROUP_TITLES[name] ?? humanise(name.replace(/Feature$/, '')), entries })
  }

  return groups
}
