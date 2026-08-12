import { format } from 'date-fns'
import { formatProductName, type PapEventType, type StatSummary } from '@/lib/pap'
import { deviceTimeAt } from '@/lib/pap/device-time'
import { isDeviceGuideId, type DeviceGuideId } from './device-guides'
import type { ExportedDay, ExportedImport, PatientProfile } from './repository'

const DEVICE_CLOCK_FORMAT = 'yyyy-MM-dd HH:mm:ss'
const MINUTE_MS = 60_000
const SECOND_MS = 1_000

const PRESSURE_DECIMALS = 2
const LEAK_DECIMALS = 1
const RATE_DECIMALS = 1
const VOLUME_DECIMALS = 0
const VENTILATION_DECIMALS = 2
const INDEX_DECIMALS = 2
const MINUTE_DECIMALS = 1
const SECOND_DECIMALS = 1
const ENVIRONMENT_DECIMALS = 1

const NIGHT_COLUMNS = [
  'Export.date',
  'Export.nightStart',
  'Export.nightEnd',
  'Export.sessionCount',
  'Export.usageMinutes',
  'Export.ahi',
  'Export.oai',
  'Export.cai',
  'Export.hi',
  'Export.ai',
  'Export.uai',
  'Export.rera',
  'Export.periodicBreathingMinutes',
  'Export.maskEvents',
  'Export.maskPressureMedian',
  'Export.maskPressureP95',
  'Export.maskPressureMax',
  'Export.targetEpapMedian',
  'Export.targetEpapP95',
  'Export.targetEpapMax',
  'Export.leakMedian',
  'Export.leakP95',
  'Export.leakMax',
  'Export.respiratoryRateMedian',
  'Export.respiratoryRateP95',
  'Export.respiratoryRateMax',
  'Export.tidalVolumeMedian',
  'Export.tidalVolumeP95',
  'Export.tidalVolumeMax',
  'Export.minuteVentilationMedian',
  'Export.minuteVentilationP95',
  'Export.minuteVentilationMax',
  'Export.ambientHumidity',
  'Export.humidifierTemperature',
  'Export.mode',
  'Export.setPressure',
  'Export.minPressure',
  'Export.maxPressure',
  'Export.startPressure',
  'Export.epr',
  'Export.eprType',
  'Export.eprLevel',
  'Export.ramp',
  'Export.rampMinutes',
  'Export.smartStart',
  'Export.mask',
  'Export.antibacterialFilter',
  'Export.humidifier',
  'Export.humidifierLevel',
  'Export.climateControl',
  'Export.heatedTube',
  'Export.tubeTemperature',
  'Export.patientView',
] as const

const EVENT_COLUMNS = ['Export.date', 'Export.event', 'Export.eventStart', 'Export.eventSeconds'] as const

const SESSION_COLUMNS = ['Export.date', 'Export.sessionStart', 'Export.sessionEnd', 'Export.sessionMinutes'] as const

const PROFILE_COLUMNS = [
  'Export.bornOn',
  'Export.heightCm',
  'Export.weightKg',
  'Export.diagnosedOn',
  'Export.diagnosisAhi',
  'Export.device',
] as const

const IMPORT_COLUMNS = [
  'Export.importId',
  'Export.brand',
  'Export.device',
  'Device.serialNumber',
  'Device.productCode',
  'Device.firmware',
  'Device.bootloader',
  'Device.dataModel',
  'Device.regions',
  'Export.fileCount',
  'Export.committedAt',
  'Export.createdAt',
] as const

const DEVICE_SETTING_COLUMNS = [
  'Export.importId',
  'Export.settingGroup',
  'Export.setting',
  'Export.settingValue',
] as const

export const EXPORT_COLUMN_KEYS = [
  ...NIGHT_COLUMNS,
  ...EVENT_COLUMNS,
  ...SESSION_COLUMNS,
  ...PROFILE_COLUMNS,
  ...IMPORT_COLUMNS,
  ...DEVICE_SETTING_COLUMNS,
] as const

export type ExportColumnKey = (typeof EXPORT_COLUMN_KEYS)[number]

export const EXPORT_SHEET_KEYS = [
  'Export.sheetNights',
  'Export.sheetEvents',
  'Export.sheetSessions',
  'Export.sheetProfile',
  'Export.sheetImports',
  'Export.sheetDeviceSettings',
] as const

export type ExportSheetKey = (typeof EXPORT_SHEET_KEYS)[number]

export type ExportCell = string | number | null

export interface ExportTable {
  name: ExportSheetKey
  columns: readonly ExportColumnKey[]
  rows: ExportCell[][]
}

export interface ExportNames {
  event: (type: PapEventType) => string
  deviceGuide: (id: DeviceGuideId) => string
}

function round(value: number | null | undefined, decimals: number): number | null {
  if (value === null || value === undefined) return null

  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function deviceClock(atMs: number): string {
  return format(deviceTimeAt(atMs), DEVICE_CLOCK_FORMAT)
}

function statCells(stat: StatSummary | undefined, decimals: number): ExportCell[] {
  return [round(stat?.median, decimals), round(stat?.percentile95, decimals), round(stat?.max, decimals)]
}

export function nightsTable(days: ExportedDay[]): ExportTable {
  const rows = days.map((day): ExportCell[] => {
    const { summary, settings } = day
    // With no session to measure from, a night is anchored to the noon its therapy day starts at.
    // That is where the day sits, not when anyone put a mask on, and these two columns say mask.
    const measured = day.sessionCount > 0

    return [
      day.date,
      measured ? deviceClock(day.startMs) : null,
      measured ? deviceClock(day.endMs) : null,
      day.sessionCount,
      round(day.usageMinutes, MINUTE_DECIMALS),
      round(day.ahi, INDEX_DECIMALS),
      round(day.oai, INDEX_DECIMALS),
      round(day.cai, INDEX_DECIMALS),
      round(day.hi, INDEX_DECIMALS),
      round(summary?.ai, INDEX_DECIMALS),
      round(summary?.uai, INDEX_DECIMALS),
      round(day.reraIndex, INDEX_DECIMALS),
      round(summary?.csrMinutes, MINUTE_DECIMALS),
      summary?.maskEvents ?? null,
      ...statCells(summary?.maskPressure, PRESSURE_DECIMALS),
      ...statCells(summary?.targetEpap, PRESSURE_DECIMALS),
      ...statCells(summary?.leak, LEAK_DECIMALS),
      ...statCells(summary?.respiratoryRate, RATE_DECIMALS),
      ...statCells(summary?.tidalVolume, VOLUME_DECIMALS),
      ...statCells(summary?.minuteVentilation, VENTILATION_DECIMALS),
      round(summary?.ambientHumidity, ENVIRONMENT_DECIMALS),
      round(summary?.humidifierTemperature, ENVIRONMENT_DECIMALS),
      settings?.mode ?? null,
      round(settings?.setPressure, LEAK_DECIMALS),
      round(settings?.minPressure, LEAK_DECIMALS),
      round(settings?.maxPressure, LEAK_DECIMALS),
      round(settings?.startPressure, LEAK_DECIMALS),
      settings?.eprEnabled ?? null,
      settings?.eprType ?? null,
      settings?.eprLevel ?? null,
      settings?.rampMode ?? null,
      settings?.rampMinutes ?? null,
      settings?.smartStart ?? null,
      settings?.maskType ?? null,
      settings?.antibacterialFilter ?? null,
      settings?.humidifierEnabled ?? null,
      settings?.humidifierLevel ?? null,
      settings?.climateControl ?? null,
      settings?.heatedTube ?? null,
      round(settings?.tubeTemperature, VOLUME_DECIMALS),
      settings?.patientAccess ?? null,
    ]
  })

  return { name: 'Export.sheetNights', columns: NIGHT_COLUMNS, rows }
}

export function eventsTable(days: ExportedDay[], names: ExportNames): ExportTable {
  const rows = days.flatMap((day) =>
    day.events.map((event): ExportCell[] => [
      day.date,
      names.event(event.type),
      deviceClock(event.startMs),
      round(event.durationMs / SECOND_MS, SECOND_DECIMALS),
    ]),
  )

  return { name: 'Export.sheetEvents', columns: EVENT_COLUMNS, rows }
}

export function sessionsTable(days: ExportedDay[]): ExportTable {
  const rows = days.flatMap((day) =>
    day.sessionBounds.map((session): ExportCell[] => [
      day.date,
      deviceClock(session.startMs),
      deviceClock(session.endMs),
      round((session.endMs - session.startMs) / MINUTE_MS, MINUTE_DECIMALS),
    ]),
  )

  return { name: 'Export.sheetSessions', columns: SESSION_COLUMNS, rows }
}

export function profileTable(profile: PatientProfile | null, names: ExportNames): ExportTable {
  const guide = profile?.deviceGuide
  const rows: ExportCell[][] = profile
    ? [
        [
          profile.bornOn,
          profile.heightCm,
          profile.weightKg,
          profile.diagnosedOn,
          profile.diagnosisAhi,
          guide && isDeviceGuideId(guide) ? names.deviceGuide(guide) : null,
        ],
      ]
    : []

  return { name: 'Export.sheetProfile', columns: PROFILE_COLUMNS, rows }
}

export function importsTable(imports: ExportedImport[]): ExportTable {
  const rows = imports.map((entry): ExportCell[] => {
    const device = entry.device

    return [
      entry.id,
      entry.brand,
      device ? formatProductName(device.productName) : null,
      device?.serialNumber ?? null,
      device?.productCode ?? null,
      device?.applicationIdentifier ?? null,
      device?.bootloaderIdentifier ?? null,
      device?.dataVersion ?? null,
      device?.regions.join(', ') ?? null,
      entry.fileCount,
      entry.committedAt?.toISOString() ?? null,
      entry.createdAt.toISOString(),
    ]
  })

  return { name: 'Export.sheetImports', columns: IMPORT_COLUMNS, rows }
}

export function deviceSettingsTable(imports: ExportedImport[]): ExportTable {
  const rows = imports.flatMap((entry) =>
    entry.settingGroups.flatMap((group) =>
      group.entries.map((setting): ExportCell[] => [entry.id, group.title, setting.label, setting.value]),
    ),
  )

  return { name: 'Export.sheetDeviceSettings', columns: DEVICE_SETTING_COLUMNS, rows }
}

export interface ExportSheet {
  name: string
  columns: string[]
  rows: ExportCell[][]
}

const CSV_DELIMITER = ','
const CSV_LINE_BREAK = '\r\n'
const CSV_QUOTED = /["\r\n,]/

/**
 * Excel reads a CSV in the system code page unless the file opens with a UTF-8 byte order mark, which
 * turns every Turkish letter outside ASCII into mojibake.
 */
const UTF8_BYTE_ORDER_MARK = '﻿'

function csvField(cell: ExportCell): string {
  if (cell === null) return ''
  if (typeof cell === 'number') return String(cell)

  return CSV_QUOTED.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell
}

/**
 * One line at a time, so a year of nights leaves the function as a stream rather than as one body
 * over the 4.5 MB a Vercel response may carry.
 */
export function* csvLines(sheet: ExportSheet): Generator<string> {
  yield UTF8_BYTE_ORDER_MARK + sheet.columns.map(csvField).join(CSV_DELIMITER) + CSV_LINE_BREAK

  for (const row of sheet.rows) {
    yield row.map(csvField).join(CSV_DELIMITER) + CSV_LINE_BREAK
  }
}
