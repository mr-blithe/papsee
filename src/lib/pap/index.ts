import { detectCard, isSupported } from './detect'
import { papDayKey } from './device-time'
import { toPapDay, type DigitalDay } from './digital'
import { buildSessions } from './resmed/datalog'
import { parseIdentification, parseIdentificationTgt } from './resmed/identification'
import { parseCurrentSettings } from './resmed/settings'
import { parseStr } from './resmed/str'
import type { CardBrand } from './detect'
import type { CardDaySummary, DeviceInfo, PapDay, PapFile, PapImport, SettingGroup } from './types'

export * from './types'
export { BRAND_NAMES, isSupported, type CardBrand } from './detect'
export { isPapDayKey, papDayDate } from './device-time'
export { toPapDay, type DigitalDay } from './digital'
export { assignFilesToDays } from './files'
export { LARGE_LEAK_THRESHOLD } from './resmed/channels'
export { formatProductName } from './resmed/identification'
export {
  ahiOverTime,
  allEvents,
  channelAverage,
  countEvents,
  eventIndices,
  formatDuration,
  sessionDurationMs,
  timeAtPressure,
  truncateToTenth,
} from './stats'
export { decimate } from './decimate'

function matches(path: string, name: string): boolean {
  return path.toLowerCase().endsWith(name.toLowerCase())
}

function decodeText(data: ArrayBuffer): string {
  return new TextDecoder('utf-8').decode(data)
}

export function isDatalogPath(path: string): boolean {
  return /(^|\/)DATALOG\//i.test(path) && path.toLowerCase().endsWith('.edf')
}

export interface CardMetadata {
  brand: CardBrand | null
  device: DeviceInfo | null
  settingGroups: SettingGroup[]
  daySummaries: CardDaySummary[]
  /** Every date the card holds an STR record for, including the ones with no therapy on them. */
  coveredDates: string[]
  unreadable: string[]
}

/**
 * Everything a card says about itself and about every night on it, from the three card level files
 * alone. A year of STR is a few tens of kilobytes, so this stays cheap however large the card is.
 */
export function readCardMetadata(files: PapFile[], cardPaths: string[] = files.map((file) => file.path)): CardMetadata {
  const unreadable: string[] = []
  const brand = detectCard(cardPaths)

  if (!isSupported(brand)) {
    return { brand, device: null, settingGroups: [], daySummaries: [], coveredDates: [], unreadable }
  }

  const identificationJson = files.find((file) => matches(file.path, 'Identification.json'))
  const identificationTgt = files.find((file) => matches(file.path, 'Identification.tgt'))
  const settingsFile = files.find((file) => matches(file.path, 'CurrentSettings.json'))
  const strFile = files.find((file) => matches(file.path, 'STR.edf'))

  const device = identificationJson
    ? parseIdentification(decodeText(identificationJson.data))
    : identificationTgt
      ? parseIdentificationTgt(decodeText(identificationTgt.data))
      : null
  const settingGroups = settingsFile ? parseCurrentSettings(decodeText(settingsFile.data)) : []

  let daySummaries: CardDaySummary[] = []
  let coveredDates: string[] = []
  if (strFile) {
    try {
      const calendar = parseStr(strFile.data, device?.modelNumber ?? 0)
      daySummaries = calendar.days
      coveredDates = calendar.coveredDates
    } catch {
      unreadable.push(strFile.path)
    }
  }

  return { brand, device, settingGroups, daySummaries, coveredDates, unreadable }
}

export interface DigitalDayResult {
  day: DigitalDay
  unreadable: string[]
}

/**
 * One therapy night, parsed from its own DATALOG files plus the summary the card already carried for
 * it. Scoping the parse to a single night is what keeps a year sized import inside one request.
 */
export function buildDigitalDay(
  date: string,
  datalogFiles: PapFile[],
  summary: CardDaySummary | null,
): DigitalDayResult {
  const unreadable: string[] = []
  let sessions: DigitalDay['sessions'] = []

  try {
    sessions = buildSessions(datalogFiles)
      .filter((session) => papDayKey(session.startMs) === date)
      .sort((a, b) => a.startMs - b.startMs)
  } catch {
    unreadable.push(`DATALOG/${date}`)
  }

  const starts = sessions.map((session) => session.startMs)
  const ends = sessions.map((session) => session.endMs)

  return {
    day: {
      date,
      startMs: starts.length ? Math.min(...starts) : (summary?.noonMs ?? 0),
      endMs: ends.length ? Math.max(...ends) : (summary?.noonMs ?? 0),
      sessions,
      summary: summary?.summary ?? null,
      settings: summary?.settings ?? null,
    },
    unreadable,
  }
}

export function importPapData(files: PapFile[], cardPaths: string[] = files.map((file) => file.path)): PapImport {
  const metadata = readCardMetadata(files, cardPaths)

  if (!isSupported(metadata.brand)) {
    return { brand: metadata.brand, device: null, settingGroups: [], days: [], unreadable: metadata.unreadable }
  }

  const datalogFiles = files.filter((file) => isDatalogPath(file.path))
  const unreadable = [...metadata.unreadable]

  let sessions: DigitalDay['sessions'] = []
  try {
    sessions = buildSessions(datalogFiles)
  } catch {
    unreadable.push('DATALOG')
  }

  const dates = [
    ...new Set([
      ...sessions.map((session) => papDayKey(session.startMs)),
      ...metadata.daySummaries.map((day) => day.date),
    ]),
  ].sort()

  const days: PapDay[] = dates.map((date) => {
    const summary = metadata.daySummaries.find((candidate) => candidate.date === date) ?? null
    const daySessions = sessions.filter((session) => papDayKey(session.startMs) === date)
    const starts = daySessions.map((session) => session.startMs)
    const ends = daySessions.map((session) => session.endMs)

    return toPapDay({
      date,
      startMs: starts.length ? Math.min(...starts) : (summary?.noonMs ?? 0),
      endMs: ends.length ? Math.max(...ends) : (summary?.noonMs ?? 0),
      sessions: daySessions.sort((a, b) => a.startMs - b.startMs),
      summary: summary?.summary ?? null,
      settings: summary?.settings ?? null,
    })
  })

  return { brand: metadata.brand, device: metadata.device, settingGroups: metadata.settingGroups, days, unreadable }
}
