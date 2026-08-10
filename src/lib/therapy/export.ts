export const EXPORT_DOWNLOADS = [
  {
    format: 'json',
    fileName: 'papsee-export.json',
    contentType: 'application/json; charset=utf-8',
    label: 'formatJson',
  },
  {
    format: 'csv-nights',
    fileName: 'papsee-nights.csv',
    contentType: 'text/csv; charset=utf-8',
    label: 'formatCsvNights',
  },
  {
    format: 'csv-events',
    fileName: 'papsee-events.csv',
    contentType: 'text/csv; charset=utf-8',
    label: 'formatCsvEvents',
  },
  {
    format: 'csv-sessions',
    fileName: 'papsee-sessions.csv',
    contentType: 'text/csv; charset=utf-8',
    label: 'formatCsvSessions',
  },
  {
    format: 'csv-profile',
    fileName: 'papsee-profile.csv',
    contentType: 'text/csv; charset=utf-8',
    label: 'formatCsvProfile',
  },
  {
    format: 'csv-imports',
    fileName: 'papsee-imports.csv',
    contentType: 'text/csv; charset=utf-8',
    label: 'formatCsvImports',
  },
  {
    format: 'csv-device-settings',
    fileName: 'papsee-device-settings.csv',
    contentType: 'text/csv; charset=utf-8',
    label: 'formatCsvDeviceSettings',
  },
] as const

export type ExportDownload = (typeof EXPORT_DOWNLOADS)[number]

export type ExportFormat = ExportDownload['format']

export type ExportCsvFormat = Exclude<ExportFormat, 'json'>

const DEFAULT_EXPORT_FORMAT: ExportFormat = 'json'

export function exportDownload(format: string | null): ExportDownload | null {
  return EXPORT_DOWNLOADS.find((download) => download.format === (format ?? DEFAULT_EXPORT_FORMAT)) ?? null
}
