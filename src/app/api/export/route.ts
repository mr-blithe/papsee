import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { apiError } from '@/lib/api'
import { getPanelContext } from '@/lib/panel-context'
import { DEMO_PROFILE, demoDaysForExport } from '@/lib/therapy/demo'
import { type ExportCsvFormat, type ExportDownload, exportDownload } from '@/lib/therapy/export'
import {
  csvLines,
  deviceSettingsTable,
  eventsTable,
  type ExportColumnKey,
  type ExportNames,
  type ExportSheet,
  type ExportSheetKey,
  type ExportTable,
  importsTable,
  nightsTable,
  profileTable,
  sessionsTable,
} from '@/lib/therapy/export-tables'
import {
  type ExportedDay,
  type ExportedImport,
  getProfile,
  listDaysForExport,
  listImportsForExport,
  type PatientProfile,
} from '@/lib/therapy/repository'

const EXPORT_VERSION = 1
const CACHE_CONTROL = 'private, no-store'

type Translate = (key: ExportSheetKey | ExportColumnKey) => string

interface ExportData {
  profile: PatientProfile | null
  days: ExportedDay[]
  imports: ExportedImport[]
}

// A year of nights is larger than the 4.5 MB a Vercel function may return, and only a streamed body
// is exempt: https://vercel.com/docs/functions/limitations#request-body-size
function attachment(chunks: Iterable<string>, download: ExportDownload): Response {
  const encoder = new TextEncoder()
  const iterator = chunks[Symbol.iterator]()

  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = iterator.next()
      if (next.done) controller.close()
      else controller.enqueue(encoder.encode(next.value))
    },
  })

  return new Response(body, {
    headers: {
      'content-type': download.contentType,
      'content-disposition': `attachment; filename="${download.fileName}"`,
      'cache-control': CACHE_CONTROL,
    },
  })
}

/**
 * One night per line. The whole document is never held as a single string, and a reader opening the
 * file still gets something they can scan.
 */
function* jsonLines({ profile, days, imports }: ExportData): Generator<string> {
  yield `{\n"version": ${EXPORT_VERSION},\n"profile": ${JSON.stringify(profile)},\n"days": [\n`

  for (const [index, day] of days.entries()) {
    yield (index === 0 ? '' : ',\n') + JSON.stringify(day)
  }

  yield `\n],\n"imports": ${JSON.stringify(imports)}\n}\n`
}

function csvTable(format: ExportCsvFormat, data: ExportData, names: ExportNames): ExportTable {
  switch (format) {
    case 'csv-nights':
      return nightsTable(data.days)
    case 'csv-events':
      return eventsTable(data.days, names)
    case 'csv-sessions':
      return sessionsTable(data.days)
    case 'csv-profile':
      return profileTable(data.profile, names)
    case 'csv-imports':
      return importsTable(data.imports)
    case 'csv-device-settings':
      return deviceSettingsTable(data.imports)
  }
}

function resolve(table: ExportTable, t: Translate): ExportSheet {
  return { name: t(table.name), columns: table.columns.map((column) => t(column)), rows: table.rows }
}

export async function GET(request: Request) {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')

  const { searchParams } = new URL(request.url)
  const download = exportDownload(searchParams.get('format'))
  if (!download) return apiError('invalidRequest')

  const requestedLocale = searchParams.get('locale')
  const locale = hasLocale(routing.locales, requestedLocale) ? requestedLocale : routing.defaultLocale

  const [profile, days, imports] = context.demo
    ? [DEMO_PROFILE, demoDaysForExport(Date.now()), []]
    : await Promise.all([
        getProfile(context.userId),
        listDaysForExport(context.userId),
        listImportsForExport(context.userId),
      ])

  const data: ExportData = { profile, days, imports }

  if (download.format === 'json') return attachment(jsonLines(data), download)

  const t = await getTranslations({ locale })
  const names: ExportNames = { event: (type) => t(`Events.${type}`), deviceGuide: (id) => t(`Devices.${id}`) }

  return attachment(csvLines(resolve(csvTable(download.format, data, names), t)), download)
}
