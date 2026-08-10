import { assignFilesToDays, isImportable } from '../files'
import { buildSessions } from './datalog'
import { parseIdentification, parseIdentificationTgt } from './identification'
import { parseCurrentSettings } from './settings'
import { parseStr } from './str'
import type { CardContents, CardFileHead, CardLoader } from '../loaders'
import type { PapFile } from '../types'

const CARD_LEVEL_FILES = ['identification.json', 'identification.tgt', 'currentsettings.json', 'str.edf']

function basename(path: string): string {
  return path.split('/').pop()?.toLowerCase() ?? ''
}

function matches(path: string, name: string): boolean {
  return path.toLowerCase().endsWith(name.toLowerCase())
}

function decodeText(data: ArrayBuffer): string {
  return new TextDecoder('utf-8').decode(data)
}

function readCard(files: PapFile[]): CardContents {
  const unreadable: string[] = []

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

  let daySummaries: CardContents['daySummaries'] = []
  let coveredDates: string[] = []
  if (strFile) {
    try {
      const calendar = parseStr(strFile.data, device?.modelNumber ?? null)
      daySummaries = calendar.days
      coveredDates = calendar.coveredDates
    } catch {
      unreadable.push(strFile.path)
    }

    if (!device) unreadable.push(identificationJson?.path ?? identificationTgt?.path ?? 'Identification.json')
  }

  return { device, settingGroups, daySummaries, coveredDates, unreadable }
}

/**
 * ResMed names every session file after the clock the device was showing, so a card can be filed into
 * nights from its paths alone and `headBytes` is zero: the commit never reads a byte to date it.
 */
export const resmedLoader: CardLoader = {
  isImportable,
  isCardLevel: (path) => CARD_LEVEL_FILES.includes(basename(path)),
  readCard,
  headBytes: 0,
  assignDays: (entries: CardFileHead[]) => assignFilesToDays(entries.map((entry) => entry.path)),
  buildSessions,
}
