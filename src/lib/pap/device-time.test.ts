import { describe, expect, it } from 'vitest'
import {
  calendarDayKey,
  deviceTime,
  deviceTimeAt,
  isPapDayKey,
  papDayDate,
  papDayKey,
  papDayNoonMs,
} from './device-time'

describe('reading the clock a device wrote', () => {
  it('reads a wall clock the same way wherever the code runs', () => {
    expect(deviceTime(2026, 8, 8, 22, 30, 15).getTime()).toBe(Date.UTC(2026, 7, 8, 22, 30, 15))
  })

  it('defaults the parts a device left out to the start of the day', () => {
    expect(deviceTime(2026, 8, 8).getTime()).toBe(Date.UTC(2026, 7, 8))
  })

  it('gives back the same wall clock it was handed', () => {
    const at = deviceTimeAt(Date.UTC(2026, 7, 9, 1, 48, 49))

    expect(at.getFullYear()).toBe(2026)
    expect(at.getMonth()).toBe(7)
    expect(at.getDate()).toBe(9)
    expect(at.getHours()).toBe(1)
    expect(at.getMinutes()).toBe(48)
    expect(at.getSeconds()).toBe(49)
  })
})

describe('the therapy day a moment belongs to', () => {
  it('files an evening before midnight under that same date', () => {
    expect(papDayKey(Date.UTC(2026, 7, 8, 22, 30))).toBe('2026-08-08')
  })

  it('files the small hours under the date the night started, not the calendar date', () => {
    expect(papDayKey(Date.UTC(2026, 7, 9, 1, 48))).toBe('2026-08-08')
  })

  it('puts noon itself at the start of a new therapy day', () => {
    expect(papDayKey(Date.UTC(2026, 7, 9, 12, 0, 0))).toBe('2026-08-09')
    expect(papDayKey(Date.UTC(2026, 7, 9, 11, 59, 59))).toBe('2026-08-08')
  })

  it('rolls back across a month boundary', () => {
    expect(papDayKey(Date.UTC(2026, 8, 1, 3, 0))).toBe('2026-08-31')
  })
})

describe('recognising a therapy day key', () => {
  it('accepts a key the importer itself produced', () => {
    expect(isPapDayKey(papDayKey(Date.UTC(2026, 7, 9, 1, 48)))).toBe(true)
  })

  it('rejects a date that does not exist in the calendar', () => {
    expect(isPapDayKey('2026-02-30')).toBe(false)
    expect(isPapDayKey('2026-13-01')).toBe(false)
  })

  it('rejects anything that is not a padded ISO date, including an injection attempt', () => {
    expect(isPapDayKey('2026-8-9')).toBe(false)
    expect(isPapDayKey('')).toBe(false)
    expect(isPapDayKey("2026-08-08' or '1'='1")).toBe(false)
  })
})

describe('turning a therapy day key back into a date', () => {
  it('lands on the start of that day, so a label cannot slide into the day before', () => {
    expect(papDayDate('2026-08-08').getTime()).toBe(Date.UTC(2026, 7, 8))
  })
})

describe('where a therapy day begins', () => {
  it('anchors it at noon, which is the same instant a card summary calls its own noon', () => {
    expect(papDayNoonMs('2026-08-08')).toBe(Date.UTC(2026, 7, 8, 12))
  })

  it('files that anchor under the very day it names, so a night with no sessions cannot slide a day', () => {
    for (const key of ['2026-01-01', '2026-08-08', '2026-12-31']) {
      expect(papDayKey(papDayNoonMs(key)), key).toBe(key)
    }
  })
})

describe('the calendar date a picker works in', () => {
  it('names the day the clock actually shows, where the therapy day key still belongs to the night before', () => {
    const earlyMorning = Date.UTC(2026, 7, 9, 1, 48)

    expect(calendarDayKey(earlyMorning)).toBe('2026-08-09')
    expect(papDayKey(earlyMorning)).toBe('2026-08-08')
  })

  it('round trips a key through a date and back, so a picked day cannot drift by one', () => {
    for (const key of ['2026-01-01', '2026-08-09', '2026-12-31', '2028-02-29']) {
      expect(calendarDayKey(papDayDate(key).getTime())).toBe(key)
    }
  })
})
