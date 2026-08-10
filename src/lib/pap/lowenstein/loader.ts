import { parsePrismaConfig } from './config'
import { toDaySettings } from './events'
import { assignPrismaDays, buildPrismaSessions, readNightParameters } from './sessions'
import type { CardContents, CardLoader } from '../loaders'
import type { DaySettings, PapFile } from '../types'

const CONFIG_FILE = 'config.pscfg'
const IMPORTABLE = ['.pscfg', '.wmedf', '.xml']

/** The EDF fixed header, which is where a waveform file carries the clock that dates it. */
const EDF_FIXED_HEADER_BYTES = 256

function basename(path: string): string {
  return path.split('/').pop()?.toLowerCase() ?? ''
}

function readCard(files: PapFile[]): CardContents {
  const config = files.find((file) => basename(file.path) === CONFIG_FILE)
  const device = config ? parsePrismaConfig(new TextDecoder().decode(config.data)) : null

  // There is no card level summary on this brand: no STR, no calendar, nothing that describes a night
  // without opening it. Every index is counted from the scored events and every reading measured off
  // the waveforms, once the night itself is parsed.
  return {
    device,
    settingGroups: [],
    daySummaries: [],
    coveredDates: [],
    unreadable: config && !device ? [config.path] : [],
  }
}

function readDaySettings(files: PapFile[]): DaySettings | null {
  const parameters = readNightParameters(files)
  return parameters.size === 0 ? null : toDaySettings(parameters)
}

export const lowensteinPrismaLoader: CardLoader = {
  isImportable: (path) => IMPORTABLE.some((extension) => path.toLowerCase().endsWith(extension)),
  isCardLevel: (path) => basename(path) === CONFIG_FILE,
  readCard,
  headBytes: EDF_FIXED_HEADER_BYTES,
  assignDays: assignPrismaDays,
  buildSessions: buildPrismaSessions,
  readDaySettings,
}
