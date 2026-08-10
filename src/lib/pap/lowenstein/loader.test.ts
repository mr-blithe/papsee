import { describe, expect, it } from 'vitest'
import { importPapData } from '../index'
import { planNights } from '../synthetic/night'
import { writeSyntheticPrismaCard } from '../synthetic/prisma-card'
import type { PapEventType } from '../types'

const SEED = 'papsee-prisma-loader'
const DATES = ['2026-07-14', '2026-07-15']

const card = writeSyntheticPrismaCard({ seed: SEED, dates: DATES })
const nights = planNights(SEED, DATES[DATES.length - 1], DATES.length)
const imported = importPapData(card)

/** The device has no id for an unclassified apnea, so the fixture never writes one. */
const SCORED: PapEventType[] = ['obstructiveApnea', 'centralApnea', 'apnea', 'hypopnea', 'rera', 'periodicBreathing']

// The header clock is written to a whole second and the event fields to a tenth of one, so the round
// trip can only be as sharp as those. Reading the flag as a start would be out by the event's own
// length, which is tens of seconds.
const FIXTURE_TOLERANCE_MS = 1000 + 100

describe('importing a Prisma card end to end', () => {
  it('reads it as a Löwenstein Prisma card rather than refusing it', () => {
    expect(imported.brand).toBe('lowensteinPrisma')
    expect(imported.unreadable).toEqual([])
  })

  it('names the model from the config file, which is the only place it is written', () => {
    expect(imported.device?.productName).toBe('Prisma Smart')
    expect(imported.device?.serialNumber).toBe('0x2FA1B3')
  })

  it('recovers one night per night the card holds, dated from the waveform clock alone', () => {
    expect(imported.days.map((day) => day.date)).toEqual(DATES)
  })

  it('recovers one session per session the night planned', () => {
    for (const [index, day] of imported.days.entries()) {
      expect(day.sessions.length, day.date).toBe(nights[index].sessions.length)
    }
  })

  it('keeps two sessions that share an id in different day directories apart', () => {
    const starts = imported.days.flatMap((day) => day.sessions.map((session) => session.startMs))

    expect(new Set(starts).size).toBe(starts.length)
  })

  it('starts each scored event a duration before the flag, because the device writes the end', () => {
    for (const [index, day] of imported.days.entries()) {
      const recovered = day.sessions
        .flatMap((session) => session.events)
        .filter((event) => event.type !== 'periodicBreathing')
        .sort((a, b) => a.startMs - b.startMs)
      const planted = nights[index].events
        .filter((event) => SCORED.includes(event.type) && event.type !== 'periodicBreathing')
        .sort((a, b) => a.startMs - b.startMs)

      expect(recovered.length, day.date).toBe(planted.length)
      for (const [at, event] of recovered.entries()) {
        expect(event.type, `${day.date} #${at}`).toBe(planted[at].type)
        expect(Math.abs(event.startMs - planted[at].startMs), `${day.date} #${at} start`).toBeLessThan(
          FIXTURE_TOLERANCE_MS,
        )
      }
    }
  })

  it('scores nothing for an event id the device writes but PapSee models as a channel', () => {
    const types = new Set(imported.days.flatMap((day) => day.sessions.flatMap((s) => s.events.map((e) => e.type))))

    expect(types.has('unclassifiedApnea')).toBe(false)
    for (const type of types) expect(SCORED, type).toContain(type)
  })

  it('recovers the waveforms, including the ones the card stored one byte wide', () => {
    const channels = imported.days[0].sessions[0].channels.map((channel) => channel.id)

    expect(channels).toContain('flow')
    expect(channels).toContain('maskPressure')
    expect(channels).toContain('leak')
    expect(channels).toContain('expiratoryPressure')
  })

  it('reports leak in litres per second, the unit every brand here is stored in', () => {
    const leak = imported.days[0].sessions[0].channels.find((channel) => channel.id === 'leak')

    expect(leak?.unit).toBe('L/s')
  })

  it('measures the night itself, because this card carries no summary to read one from', () => {
    const summary = imported.days[0].summary

    expect(summary?.leak.percentile95).not.toBeNull()
    expect(summary?.maskPressure.percentile95).not.toBeNull()
    // Counted from the events by the day index instead, so reporting one here would be a second answer.
    expect(summary?.ahi).toBeNull()
  })

  it('reports the settings the device was running, from the session event file', () => {
    const settings = imported.days[0].settings

    expect(settings?.mode).toBe('APAP')
    expect(settings?.minPressure).toBeCloseTo(nights[0].settings.minPressure ?? 0, 1)
    expect(settings?.maxPressure).toBeCloseTo(nights[0].settings.maxPressure ?? 0, 1)
    expect(settings?.setPressure).toBeNull()
  })

  it('admits what this device never wrote instead of inventing it', () => {
    const settings = imported.days[0].settings

    expect(settings?.maskType).toBe('Unknown')
    expect(settings?.humidifierEnabled).toBe('Unknown')
    expect(settings?.humidifierLevel).toBeNull()
    expect(settings?.eprLevel).toBeNull()
  })
})

describe('a Prisma card whose model is not one anybody has tested', () => {
  it('still imports, reporting the model as unknown rather than guessing at it', () => {
    const strange = writeSyntheticPrismaCard({ seed: SEED, dates: [DATES[0]] }).map((file) =>
      file.path === 'config.pscfg'
        ? { path: file.path, data: new TextEncoder().encode('{"devid":"0xFF","dev":{"sn":"1"}}').buffer as ArrayBuffer }
        : file,
    )

    const read = importPapData(strange)

    expect(read.device?.productName).toBe('Unknown Model')
    expect(read.days.length).toBe(1)
    expect(read.days[0].sessions.length).toBeGreaterThan(0)
  })
})
