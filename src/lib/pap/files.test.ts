import { describe, expect, it } from 'vitest'
import { assignFilesToDays, isImportable } from './files'

describe('which files on a card are worth reading', () => {
  it('accepts the three extensions a ResMed card carries its data in', () => {
    expect(isImportable('STR.edf')).toBe(true)
    expect(isImportable('Identification.json')).toBe(true)
    expect(isImportable('Identification.tgt')).toBe(true)
  })

  it('ignores the checksum and journal files the device leaves beside them', () => {
    expect(isImportable('DATALOG/20260808/20260808.crc')).toBe(false)
    expect(isImportable('journal.jnl')).toBe(false)
    expect(isImportable('holiday/photo.jpg')).toBe(false)
  })

  it('matches the extension whatever case the device wrote it in', () => {
    expect(isImportable('STR.EDF')).toBe(true)
    expect(isImportable('Identification.JSON')).toBe(true)
  })
})

describe('assigning stored card files to the therapy day they belong to', () => {
  it('files a DATALOG file written after midnight under the night it started', () => {
    const assigned = assignFilesToDays(['DATALOG/20260809/20260809_014849_BRP.edf'])

    expect(assigned.get('DATALOG/20260809/20260809_014849_BRP.edf')).toBe('2026-08-08')
  })

  it('reads the day from the filename timestamp rather than the folder name', () => {
    const assigned = assignFilesToDays([
      'DATALOG/20260808/20260808_213000_BRP.edf',
      'DATALOG/20260809/20260809_014849_BRP.edf',
    ])

    expect([...new Set(assigned.values())]).toEqual(['2026-08-08'])
  })

  it('leaves the card level files unassigned, so every day can be replayed with them', () => {
    const assigned = assignFilesToDays(['Identification.json', 'SETTINGS/CurrentSettings.json', 'STR.edf'])

    expect(assigned.get('Identification.json')).toBeNull()
    expect(assigned.get('SETTINGS/CurrentSettings.json')).toBeNull()
    expect(assigned.get('STR.edf')).toBeNull()
  })

  it('leaves a file it cannot place unassigned rather than guessing a day for it', () => {
    const assigned = assignFilesToDays(['DATALOG/20260808/notes.edf'])

    expect(assigned.get('DATALOG/20260808/notes.edf')).toBeNull()
  })

  it('splits a card holding two nights into two days', () => {
    const assigned = assignFilesToDays([
      'STR.edf',
      'DATALOG/20260808/20260808_213000_BRP.edf',
      'DATALOG/20260809/20260809_014849_BRP.edf',
      'DATALOG/20260809/20260809_223000_BRP.edf',
      'DATALOG/20260810/20260810_020000_BRP.edf',
    ])

    expect(assigned.get('DATALOG/20260808/20260808_213000_BRP.edf')).toBe('2026-08-08')
    expect(assigned.get('DATALOG/20260809/20260809_014849_BRP.edf')).toBe('2026-08-08')
    expect(assigned.get('DATALOG/20260809/20260809_223000_BRP.edf')).toBe('2026-08-09')
    expect(assigned.get('DATALOG/20260810/20260810_020000_BRP.edf')).toBe('2026-08-09')
  })

  it('assigns the event and settings files of a session to the same day as its waveforms', () => {
    const assigned = assignFilesToDays([
      'DATALOG/20260809/20260809_014849_BRP.edf',
      'DATALOG/20260809/20260809_014849_EVE.edf',
      'DATALOG/20260809/20260809_014849_CSL.edf',
    ])

    expect([...new Set(assigned.values())]).toEqual(['2026-08-08'])
  })
})
