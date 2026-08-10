import { describe, expect, it } from 'vitest'
import { assignFilesToDays, buildDigitalDay, importPapData, isDatalogPath, readCardMetadata, toPapDay } from './index'
import { writeSyntheticCard } from './synthetic/card'

const SEED = 'papsee-import-test'
const DATE = '2026-07-14'

const card = writeSyntheticCard({ seed: SEED, dates: [DATE] })

describe('recognising what was handed to us', () => {
  it('names a brand we cannot read instead of returning a blank night', () => {
    const philips = importPapData([], ['P-SERIES/P1234567/PROP.TXT', 'P-SERIES/P1234567/1.001'])

    expect(philips.brand).toBe('philips')
    expect(philips.days).toEqual([])
    expect(philips.device).toBeNull()
  })

  it('reports nothing recognised for a folder that holds no card at all', () => {
    expect(importPapData([], ['holiday/photo.jpg']).brand).toBeNull()
  })

  it('reports a ResMed card it can read', () => {
    expect(importPapData(card).brand).toBe('resmed')
  })

  it('detects the brand from the paths alone, before any file is parsed', () => {
    expect(importPapData([], ['DATALOG/20260808/20260808_213000_BRP.edf']).brand).toBe('resmed')
  })
})

describe('identifying the device', () => {
  it('reads the device from the identification file the AirSense generation writes', () => {
    const result = importPapData(card)

    expect(result.device?.modelNumber).toBe(39410)
    expect(result.device?.productCode).toBe('39410')
  })

  it('falls back to the identification file the S9 and AirSense 10 generation writes', () => {
    const tgt = new TextEncoder().encode('#SRN 22121234567\r\n#PCD 36037\r\n#PNA S9_AutoSet\r\n')
    const result = importPapData([{ path: 'Identification.tgt', data: tgt.buffer as ArrayBuffer }])

    expect(result.brand).toBe('resmed')
    expect(result.device?.serialNumber).toBe('22121234567')
    expect(result.device?.modelNumber).toBe(36037)
    expect(result.device?.productName).toBe('S9 AutoSet')
  })
})

describe('the settings the card reports about itself', () => {
  it('reads the current settings groups the device wrote', () => {
    const result = importPapData(card)

    expect(result.settingGroups.length).toBeGreaterThan(0)
    for (const group of result.settingGroups) {
      expect(group.title.length).toBeGreaterThan(0)
      expect(group.entries.length).toBeGreaterThan(0)
    }
  })
})

describe('the day a card is filed under', () => {
  it('spans the day from the first session to the last', () => {
    const day = importPapData(card).days[0]
    const starts = day.sessions.map((session) => session.startMs)
    const ends = day.sessions.map((session) => session.endMs)

    expect(day.startMs).toBe(Math.min(...starts))
    expect(day.endMs).toBe(Math.max(...ends))
  })

  it('orders the sessions of the day by start time', () => {
    const day = importPapData(card).days[0]

    for (let index = 1; index < day.sessions.length; index += 1) {
      expect(day.sessions[index].startMs).toBeGreaterThan(day.sessions[index - 1].startMs)
    }
  })

  it('orders the events of each session by onset', () => {
    for (const session of importPapData(card).days[0].sessions) {
      for (let index = 1; index < session.events.length; index += 1) {
        expect(session.events[index].startMs).toBeGreaterThanOrEqual(session.events[index - 1].startMs)
      }
    }
  })

  it('keeps every event inside the day it belongs to', () => {
    const day = importPapData(card).days[0]

    for (const session of day.sessions) {
      for (const event of session.events) {
        expect(event.startMs).toBeGreaterThanOrEqual(day.startMs)
        expect(event.startMs).toBeLessThanOrEqual(day.endMs)
      }
    }
  })
})

describe('an incomplete card', () => {
  it('returns an empty import rather than throwing when handed no files', () => {
    const empty = importPapData([])

    expect(empty.device).toBeNull()
    expect(empty.days).toEqual([])
    expect(empty.settingGroups).toEqual([])
    expect(empty.brand).toBeNull()
  })

  it('still reports the device when the data files are missing', () => {
    const identificationOnly = card.filter((file) => file.path.endsWith('Identification.json'))
    const result = importPapData(identificationOnly)

    expect(result.device?.modelNumber).toBe(39410)
    expect(result.days).toEqual([])
  })

  it('names the file it could not read rather than losing the whole import', () => {
    const broken = card.map((file) =>
      file.path === 'STR.edf' ? { path: file.path, data: new Uint8Array([1, 2, 3]).buffer as ArrayBuffer } : file,
    )
    const result = importPapData(broken)

    expect(result.device?.modelNumber).toBe(39410)
    expect(result.days.length).toBeGreaterThan(0)
  })

  it('reads a card that carries no unreadable file without reporting one', () => {
    expect(importPapData(card).unreadable).toEqual([])
  })
})

describe('parsing one night at a time instead of the whole card', () => {
  const DATES = ['2026-07-14', '2026-07-15', '2026-07-16']
  const multiDay = writeSyntheticCard({ seed: SEED, dates: DATES })

  function perDay(scopeFiles: boolean) {
    const metadata = readCardMetadata(multiDay)
    const datalog = multiDay.filter((file) => isDatalogPath(file.path))
    const assignment = assignFilesToDays(datalog.map((file) => file.path))

    return DATES.map((date) => {
      const files = scopeFiles ? datalog.filter((file) => assignment.get(file.path) === date) : datalog
      const summary = metadata.daySummaries.find((candidate) => candidate.date === date) ?? null

      return toPapDay(buildDigitalDay(date, files, summary).day)
    })
  }

  it('produces the same nights the whole card parse produces, so an incremental import cannot drift', () => {
    expect(perDay(true)).toEqual(importPapData(multiDay).days)
  })

  it('keeps a night to its own sessions even when handed the whole card, so a stray file cannot bleed in', () => {
    expect(perDay(false)).toEqual(importPapData(multiDay).days)
  })

  it('reads the card metadata without touching a single waveform file', () => {
    const cardLevel = multiDay.filter((file) => !isDatalogPath(file.path))
    const metadata = readCardMetadata(
      cardLevel,
      multiDay.map((file) => file.path),
    )

    expect(metadata.brand).toBe('resmed')
    expect(metadata.device?.modelNumber).toBeGreaterThan(0)
    expect(metadata.daySummaries.map((day) => day.date)).toEqual(DATES)
  })

  it('loses only the corrupt night, where a whole card parse loses every session on the card', () => {
    const datalog = multiDay.filter((file) => isDatalogPath(file.path))
    const assignment = assignFilesToDays(datalog.map((file) => file.path))
    const broken = datalog
      .filter((file) => assignment.get(file.path) === DATES[1])
      .map((file) => ({ path: file.path, data: new ArrayBuffer(8) }))

    const damaged = buildDigitalDay(DATES[1], broken, null)
    const intact = buildDigitalDay(
      DATES[0],
      datalog.filter((file) => assignment.get(file.path) === DATES[0]),
      null,
    )

    expect(damaged.unreadable).toEqual([`DATALOG/${DATES[1]}`])
    expect(damaged.day.sessions).toEqual([])
    expect(intact.unreadable).toEqual([])
    expect(intact.day.sessions.length).toBeGreaterThan(0)
  })
})

describe('a card covering nights the machine was never switched on', () => {
  const DATES = ['2026-07-14', '2026-07-15', '2026-07-16']
  const SKIPPED = DATES[1]

  const sparse = writeSyntheticCard({ seed: SEED, dates: DATES, noUseDates: [SKIPPED] })

  it('imports only the nights with therapy on them, so a year of standby does not become a year of history', () => {
    expect(importPapData(sparse).days.map((day) => day.date)).toEqual([DATES[0], DATES[2]])
  })

  it('leaves the unused night out of the summaries the commit writes its day rows from', () => {
    const metadata = readCardMetadata(
      sparse.filter((file) => !isDatalogPath(file.path)),
      sparse.map((file) => file.path),
    )

    expect(metadata.daySummaries.map((day) => day.date)).toEqual([DATES[0], DATES[2]])
  })

  it('still reads the nights either side of it in full', () => {
    for (const day of importPapData(sparse).days) {
      expect(day.sessions.length).toBeGreaterThan(0)
      expect(day.summary?.usageMinutes).toBeGreaterThan(0)
    }
  })
})
