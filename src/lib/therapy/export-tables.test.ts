// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { importPapData } from '@/lib/pap'
import { writeSyntheticCard } from '@/lib/pap/synthetic/resmed-card'
import { toDayIndexRow } from './day-index'
import {
  deviceSettingsTable,
  eventsTable,
  type ExportNames,
  type ExportSheet,
  type ExportTable,
  importsTable,
  nightsTable,
  profileTable,
  sessionsTable,
  csvLines,
} from './export-tables'
import type { ExportedDay, ExportedImport } from './repository'

const SEED = 'papsee-export-test'
const DATES = ['2026-08-08', '2026-08-09']

const names: ExportNames = {
  event: (type) => `event:${type}`,
  deviceGuide: (id) => `guide:${id}`,
}

function exportedDays(dates: string[] = DATES): ExportedDay[] {
  const card = writeSyntheticCard({ seed: SEED, dates, waveforms: true })

  return importPapData(card)
    .days.map(toDayIndexRow)
    .map((row) => ({ ...row, sessionCount: row.sessionBounds.length }))
}

function summaryOnlyNight(): ExportedDay {
  return {
    date: '2026-08-07',
    startMs: Date.UTC(2026, 7, 7, 23, 14, 5),
    endMs: Date.UTC(2026, 7, 8, 6, 2, 30),
    usageMinutes: 408.20001,
    ahi: 4.199999809265137,
    oai: 1.2,
    cai: 0.4,
    hi: 2.5,
    reraIndex: 0.9,
    leakP95: null,
    pressureP95: null,
    sessionCount: 0,
    summary: null,
    settings: null,
    sessionBounds: [],
    events: [],
  }
}

const anImport: ExportedImport = {
  id: '11111111-2222-3333-4444-555555555555',
  brand: 'resmed',
  device: null,
  settingGroups: [
    { title: 'Comfort, sleep', entries: [{ label: 'Ramp "Time"', value: 'Auto' }] },
    { title: 'Therapy', entries: [{ label: 'Mode', value: 'AutoSet' }] },
  ],
  fileCount: 12,
  committedAt: new Date('2026-08-10T09:15:00Z'),
  createdAt: new Date('2026-08-10T09:14:00Z'),
}

describe('exported tables', () => {
  const days = exportedDays()

  const tables: [string, ExportTable][] = [
    ['nights', nightsTable(days)],
    ['events', eventsTable(days, names)],
    ['sessions', sessionsTable(days)],
    [
      'profile',
      profileTable(
        {
          bornOn: '1978-04-22',
          heightCm: 178,
          weightKg: 92,
          diagnosedOn: null,
          diagnosisAhi: null,
          deviceGuide: 'resmedAirSense11',
        },
        names,
      ),
    ],
    ['imports', importsTable([anImport])],
    ['device settings', deviceSettingsTable([anImport])],
  ]

  it.each(tables)('gives the %s table a cell under every column it heads', (_name, table) => {
    expect(table.rows.length).toBeGreaterThan(0)

    for (const [index, row] of table.rows.entries()) {
      expect(row.length, `row ${index} is not as wide as the ${table.columns.length} columns it sits under`).toBe(
        table.columns.length,
      )
    }
  })
})

describe('the nights table', () => {
  it('reads a night on the clock the device showed, not the clock of the machine exporting it', () => {
    const [row] = nightsTable([summaryOnlyNight()]).rows

    expect(row[1]).toBe('2026-08-07 23:14:05')
    expect(row[2]).toBe('2026-08-08 06:02:30')
  })

  it('leaves a summary only night blank rather than reporting a pressure of zero', () => {
    const table = nightsTable([summaryOnlyNight()])
    const [row] = table.rows

    const maskPressureMedian = table.columns.indexOf('Export.maskPressureMedian')
    const mode = table.columns.indexOf('Export.mode')

    expect(row[maskPressureMedian]).toBeNull()
    expect(row[mode]).toBeNull()
    expect(row.slice(maskPressureMedian, mode + 1).every((cell) => cell === null)).toBe(true)
  })

  it('drops the drift a float32 column stores instead of writing 4.199999809265137 into a spreadsheet', () => {
    const table = nightsTable([summaryOnlyNight()])
    const [row] = table.rows

    expect(row[table.columns.indexOf('Export.ahi')]).toBe(4.2)
    expect(row[table.columns.indexOf('Export.usageMinutes')]).toBe(408.2)
  })

  it('writes one row per night, in the order the nights were read', () => {
    const table = nightsTable(exportedDays())

    expect(table.rows.map((row) => row[0])).toEqual(DATES)
  })
})

describe('the events table', () => {
  const days = exportedDays()
  const table = eventsTable(days, names)

  it('files every scored event under the night it belongs to', () => {
    const scored = days.flatMap((day) => day.events)
    expect(scored.length).toBeGreaterThan(0)
    expect(table.rows).toHaveLength(scored.length)

    const perDate = new Map<string, number>()
    for (const row of table.rows) perDate.set(String(row[0]), (perDate.get(String(row[0])) ?? 0) + 1)

    for (const day of days) {
      expect(perDate.get(day.date) ?? 0, day.date).toBe(day.events.length)
    }
  })

  it('names each event by its own type rather than by its neighbour', () => {
    const scored = days.flatMap((day) => day.events)

    expect(table.rows.map((row) => row[1])).toEqual(scored.map((event) => `event:${event.type}`))
  })

  it('reports a duration in seconds, which is the unit the device scored it in', () => {
    const scored = days.flatMap((day) => day.events)
    const longest = Math.max(...scored.map((event) => event.durationMs))

    expect(table.rows.map((row) => Number(row[3])).some((seconds) => seconds === longest / 1000)).toBe(true)
    expect(table.rows.every((row) => Number(row[3]) > 0)).toBe(true)
  })
})

describe('the sessions table', () => {
  it('gives a duration in minutes for every mask on and off the night recorded', () => {
    const days = exportedDays()
    const table = sessionsTable(days)

    expect(table.rows).toHaveLength(days.flatMap((day) => day.sessionBounds).length)

    for (const row of table.rows) {
      expect(Number(row[3]), String(row[1])).toBeGreaterThan(0)
    }
  })
})

describe('the profile table', () => {
  it('names the device rather than leaking the identifier the form stores', () => {
    const table = profileTable(
      {
        bornOn: '1978-04-22',
        heightCm: 178,
        weightKg: 92,
        diagnosedOn: null,
        diagnosisAhi: null,
        deviceGuide: 'resmedAirSense11',
      },
      names,
    )

    expect(table.rows[0].at(-1)).toBe('guide:resmedAirSense11')
  })

  it('holds no row at all when nothing has been filled in', () => {
    expect(profileTable(null, names).rows).toEqual([])
  })
})

describe('CSV serialisation', () => {
  const sheet: ExportSheet = {
    name: 'Nights',
    columns: ['Date', 'Note', 'AHI'],
    rows: [
      ['2026-08-09', 'Comfort, sleep', 4.2],
      ['2026-08-10', 'Ramp "Time"', null],
      ['2026-08-11', 'two\nlines', 0],
    ],
  }

  const csv = [...csvLines(sheet)].join('')

  it('opens with a byte order mark, without which Excel mangles every Turkish letter', () => {
    expect(csv.codePointAt(0)).toBe(0xfeff)
  })

  it('quotes a field holding the delimiter so it cannot split into two columns', () => {
    expect(csv).toContain('2026-08-09,"Comfort, sleep",4.2')
  })

  it('doubles a quote inside a field rather than ending the field early', () => {
    expect(csv).toContain('2026-08-10,"Ramp ""Time""",')
  })

  it('quotes a field holding a line break so the row cannot split in two', () => {
    expect(csv).toContain('2026-08-11,"two\nlines",0')
  })

  it('writes a missing reading as an empty field, never as a zero', () => {
    const rows = csv.slice(1).split('\r\n')

    expect(rows[2]).toBe('2026-08-10,"Ramp ""Time""",')
    expect(rows[3]).toBe('2026-08-11,"two\nlines",0')
  })

  it('ends every row, including the last, so a reader does not lose the final night', () => {
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(csv.slice(1).split('\r\n').filter(Boolean)).toHaveLength(sheet.rows.length + 1)
  })
})

describe('the device settings table', () => {
  it('flattens every group of an upload into one row per setting', () => {
    const table = deviceSettingsTable([anImport])

    expect(table.rows).toEqual([
      [anImport.id, 'Comfort, sleep', 'Ramp "Time"', 'Auto'],
      [anImport.id, 'Therapy', 'Mode', 'AutoSet'],
    ])
  })
})
