import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import tr from '../../messages/tr.json'
import { CHANNEL_IDS, PAP_EVENT_TYPES } from '@/lib/pap/types'
import { TERM_IDS } from '@/lib/terms'
import { EXPORT_COLUMN_KEYS, EXPORT_SHEET_KEYS } from '@/lib/therapy/export-tables'
import { EXPORT_DOWNLOADS } from '@/lib/therapy/export'
import { routing } from './routing'
import { DEVICE_GUIDE_IDS } from '@/lib/therapy/device-guides'

const EXCEL_SHEET_NAME_LIMIT = 31

type Catalog = Record<string, unknown>

const catalogs: Record<string, Catalog> = { en, tr }

function flatten(value: Catalog, prefix = ''): Map<string, string> {
  const flat = new Map<string, string>()

  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (entry !== null && typeof entry === 'object') {
      for (const [nested, nestedValue] of flatten(entry as Catalog, path)) flat.set(nested, nestedValue)
      continue
    }
    flat.set(path, String(entry))
  }

  return flat
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{\s*(\w+)/g)].map((match) => match[1]).sort()
}

describe('locale coverage', () => {
  it('ships a catalog for every configured locale', () => {
    expect(Object.keys(catalogs).sort()).toEqual([...routing.locales].sort())
  })
})

describe('catalog parity', () => {
  const flat = Object.fromEntries(Object.entries(catalogs).map(([locale, catalog]) => [locale, flatten(catalog)]))

  it('translates every English key into Turkish', () => {
    const missing = [...flat.en.keys()].filter((key) => !flat.tr.has(key))

    expect(missing).toEqual([])
  })

  it('carries no Turkish key that English does not define', () => {
    const orphaned = [...flat.tr.keys()].filter((key) => !flat.en.has(key))

    expect(orphaned).toEqual([])
  })

  it('leaves no message empty in any locale', () => {
    for (const [locale, messages] of Object.entries(flat)) {
      const blank = [...messages.entries()].filter(([, message]) => message.trim().length === 0).map(([key]) => key)
      expect(blank, `blank messages in ${locale}`).toEqual([])
    }
  })

  it('keeps the same interpolation placeholders in every locale', () => {
    const mismatched = [...flat.en.entries()]
      .filter(([key, message]) => {
        const translated = flat.tr.get(key)
        return translated !== undefined && placeholders(message).join() !== placeholders(translated).join()
      })
      .map(([key]) => key)

    expect(mismatched).toEqual([])
  })
})

describe('domain vocabulary coverage', () => {
  const flat = Object.fromEntries(Object.entries(catalogs).map(([locale, catalog]) => [locale, flatten(catalog)]))

  it('names every plottable channel in every locale', () => {
    for (const [locale, messages] of Object.entries(flat)) {
      const missing = CHANNEL_IDS.filter((id) => !messages.has(`Channels.${id}`))
      expect(missing, `missing channel names in ${locale}`).toEqual([])
    }
  })

  it('explains every term the panel offers a hint for, in every locale', () => {
    for (const [locale, messages] of Object.entries(flat)) {
      const missing = TERM_IDS.flatMap((id) =>
        [`Terms.${id}Title`, `Terms.${id}Body`].filter((key) => !messages.has(key)),
      )
      expect(missing, `missing term help in ${locale}`).toEqual([])
    }
  })

  it('names every scored event type in every locale', () => {
    for (const [locale, messages] of Object.entries(flat)) {
      const missing = PAP_EVENT_TYPES.filter((type) => !messages.has(`Events.${type}`))
      expect(missing, `missing event names in ${locale}`).toEqual([])
    }
  })

  it('heads every exported column and sheet in every locale', () => {
    for (const [locale, messages] of Object.entries(flat)) {
      const missing = [...EXPORT_SHEET_KEYS, ...EXPORT_COLUMN_KEYS].filter((key) => !messages.has(key))
      expect(missing, `missing export headings in ${locale}`).toEqual([])
    }
  })

  // https://support.microsoft.com/en-us/excel/rename-a-worksheet
  it('keeps every sheet name within what Excel accepts, in every locale', () => {
    for (const [locale, messages] of Object.entries(flat)) {
      const rejected = EXPORT_SHEET_KEYS.map((key) => messages.get(key) ?? '').filter(
        (name) => name.length > EXCEL_SHEET_NAME_LIMIT || /[[\]/\\:*?]/.test(name),
      )
      expect(rejected, `sheet names Excel would refuse in ${locale}`).toEqual([])
    }
  })

  it('names every download format in every locale', () => {
    for (const [locale, messages] of Object.entries(flat)) {
      const missing = EXPORT_DOWNLOADS.map((download) => `Export.${download.label}`).filter((key) => !messages.has(key))
      expect(missing, `missing download format names in ${locale}`).toEqual([])
    }
  })
})

describe('the device guides', () => {
  it.each(Object.entries(catalogs))('names and explains every guide in %s', (locale, catalog) => {
    const keys = new Set(flatten(catalog).keys())

    for (const id of DEVICE_GUIDE_IDS) {
      // Both are looked up through a template literal at the call site, so a guide added without its
      // copy renders the key path to the reader rather than a sentence.
      expect(keys, `${locale} Devices.${id}`).toContain(`Devices.${id}`)
      expect(keys, `${locale} Import.card_${id}`).toContain(`Import.card_${id}`)
    }
  })
})
