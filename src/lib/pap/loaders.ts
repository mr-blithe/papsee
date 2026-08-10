import { lowensteinPrismaLoader } from './lowenstein/loader'
import { resmedLoader } from './resmed/loader'
import type { CardBrand } from './detect'
import type { DigitalSession } from './digital'
import type { CardDaySummary, DaySettings, DeviceInfo, PapFile, SettingGroup } from './types'

/** Everything a card says about itself and about every night on it, from its card level files alone. */
export interface CardContents {
  device: DeviceInfo | null
  settingGroups: SettingGroup[]
  daySummaries: CardDaySummary[]
  /** Every date the card holds a summary record for, including the ones with no therapy on them. */
  coveredDates: string[]
  unreadable: string[]
}

/** One file and the opening bytes of it, which is all `assignDays` is given to date it by. */
export interface CardFileHead {
  path: string
  head: Uint8Array
}

export interface CardLoader {
  /** Which files are worth uploading at all. Asked in the browser, before a byte is read. */
  isImportable(path: string): boolean
  /** A file that describes the card rather than one night of it. */
  isCardLevel(path: string): boolean
  readCard(files: PapFile[]): CardContents
  /**
   * How many opening bytes `assignDays` needs from each file. Zero means it can date a card from its
   * paths alone, and the commit then skips reading any bytes for it at all.
   */
  headBytes: number
  /**
   * Which therapy day each file belongs to, or null for one that belongs to no single night. Every
   * file is offered at once because a brand may only be able to date one file from a sibling.
   */
  assignDays(entries: CardFileHead[]): Map<string, string | null>
  buildSessions(files: PapFile[]): DigitalSession[]
  /**
   * The settings the device was running that night, for a brand that writes them per session rather
   * than once for the card. A brand whose card carries them leaves this out.
   */
  readDaySettings?(files: PapFile[]): DaySettings | null
}

/**
 * The brands that can be read, and the one thing each of them is. A brand with no entry here is
 * detected and refused rather than parsed by somebody else's reader.
 */
export const CARD_LOADERS: Partial<Record<CardBrand, CardLoader>> = {
  resmed: resmedLoader,
  lowensteinPrisma: lowensteinPrismaLoader,
}

export function loaderFor(brand: CardBrand | null): CardLoader | null {
  return brand === null ? null : (CARD_LOADERS[brand] ?? null)
}
