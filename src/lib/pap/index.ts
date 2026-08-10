import { detectCard } from './detect'
import { papDayKey, papDayNoonMs } from './device-time'
import { toPapDay, type DigitalDay } from './digital'
import { loaderFor, type CardContents } from './loaders'
import { deriveDaySummary } from './summary'
import type { CardBrand } from './detect'
import type { CardDaySummary, PapDay, PapFile, PapImport } from './types'

export * from './types'
export { BRAND_NAMES, RECOGNISED_BRANDS, detectCard, isSupported, type CardBrand } from './detect'
export { loaderFor, type CardFileHead } from './loaders'
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

function headOf(file: PapFile, headBytes: number): Uint8Array {
  return headBytes === 0 ? EMPTY_HEAD : new Uint8Array(file.data, 0, Math.min(headBytes, file.data.byteLength))
}

const EMPTY_HEAD = new Uint8Array(0)

const NOTHING_READ: CardContents = {
  device: null,
  settingGroups: [],
  daySummaries: [],
  coveredDates: [],
  unreadable: [],
}

export interface CardMetadata extends CardContents {
  brand: CardBrand | null
}

/**
 * Everything a card says about itself and about every night on it, from its card level files alone. A
 * year of ResMed summaries is a few tens of kilobytes, so this stays cheap however large the card is.
 */
export function readCardMetadata(files: PapFile[], cardPaths: string[] = files.map((file) => file.path)): CardMetadata {
  const brand = detectCard(cardPaths)
  const loader = loaderFor(brand)

  return loader ? { brand, ...loader.readCard(files) } : { brand, ...NOTHING_READ }
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
  brand: CardBrand | null,
  date: string,
  dayFiles: PapFile[],
  summary: CardDaySummary | null,
): DigitalDayResult {
  const unreadable: string[] = []
  const loader = loaderFor(brand)
  let sessions: DigitalDay['sessions'] = []

  try {
    sessions = (loader?.buildSessions(dayFiles) ?? [])
      .filter((session) => papDayKey(session.startMs) === date)
      .sort((a, b) => a.startMs - b.startMs)
  } catch {
    unreadable.push(date)
  }

  const starts = sessions.map((session) => session.startMs)
  const ends = sessions.map((session) => session.endMs)

  // A card that carries no summary of its own still owes the reader the readings the panel has no
  // other source for, so they are measured off the night that was just parsed.
  const noonMs = summary?.noonMs ?? papDayNoonMs(date)

  return {
    day: {
      date,
      startMs: starts.length ? Math.min(...starts) : noonMs,
      endMs: ends.length ? Math.max(...ends) : noonMs,
      sessions,
      summary: summary?.summary ?? deriveDaySummary(sessions),
      settings: summary?.settings ?? null,
    },
    unreadable,
  }
}

export function importPapData(files: PapFile[], cardPaths: string[] = files.map((file) => file.path)): PapImport {
  const metadata = readCardMetadata(files, cardPaths)
  const loader = loaderFor(metadata.brand)

  if (!loader) {
    return { brand: metadata.brand, device: null, settingGroups: [], days: [], unreadable: metadata.unreadable }
  }

  const dayFiles = files.filter((file) => !loader.isCardLevel(file.path))
  const assignment = loader.assignDays(
    dayFiles.map((file) => ({ path: file.path, head: headOf(file, loader.headBytes) })),
  )
  const unreadable = [...metadata.unreadable]

  const dates = [
    ...new Set([
      ...[...assignment.values()].filter((date) => date !== null),
      ...metadata.daySummaries.map((day) => day.date),
    ]),
  ].sort()

  const days: PapDay[] = dates.map((date) => {
    const summary = metadata.daySummaries.find((candidate) => candidate.date === date) ?? null
    const built = buildDigitalDay(
      metadata.brand,
      date,
      dayFiles.filter((file) => assignment.get(file.path) === date),
      summary,
    )

    unreadable.push(...built.unreadable)
    return toPapDay(built.day)
  })

  return { brand: metadata.brand, device: metadata.device, settingGroups: metadata.settingGroups, days, unreadable }
}
