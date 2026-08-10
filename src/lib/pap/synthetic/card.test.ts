import { format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { deviceTime, deviceTimeAt } from '../device-time'
import { importPapData } from '../index'
import { planNight } from './night'
import { writeSyntheticCard } from './card'

const SEED = 'papsee-example-user'
const DATE = '2026-07-14'
const ANNOTATION_TENTH_MS = 100
const SECOND_MS = 1000

describe('the shape of the card the writer emits', () => {
  const files = writeSyntheticCard({ seed: SEED, dates: [DATE] })
  const paths = files.map((file) => file.path)

  it('writes the three card level files a ResMed reader looks for', () => {
    expect(paths).toContain('Identification.json')
    expect(paths).toContain('SETTINGS/CurrentSettings.json')
    expect(paths).toContain('STR.edf')
  })

  it('names the DATALOG folder from the calendar date the session started, not the therapy day', () => {
    const night = planNight(SEED, DATE)
    const afterMidnight = night.sessions.filter((session) => deviceTimeAt(session.startMs).getDate() !== 14)

    expect(afterMidnight.length, 'this night has no session after midnight to check').toBeGreaterThan(0)

    for (const session of afterMidnight) {
      const folder = format(deviceTimeAt(session.startMs), 'yyyyMMdd')
      expect(paths.some((path) => path.startsWith(`DATALOG/${folder}/`))).toBe(true)
    }
  })

  it('writes a waveform, a settings and an event file for every session', () => {
    const night = planNight(SEED, DATE)

    for (const kind of ['BRP', 'PLD', 'SA2', 'EVE', 'CSL']) {
      expect(paths.filter((path) => path.endsWith(`_${kind}.edf`))).toHaveLength(night.sessions.length)
    }
  })

  it('declares an unknown record count on the waveform files, the way the device does', () => {
    const brp = files.find((file) => file.path.endsWith('_BRP.edf'))
    expect(brp).toBeDefined()

    const declared = new TextDecoder('latin1').decode(new Uint8Array(brp!.data, 236, 8)).trim()

    expect(declared).toBe('-1')
  })

  it('can leave the waveforms out, which is what makes a month of summaries cheap', () => {
    const summaryOnly = writeSyntheticCard({ seed: SEED, dates: [DATE], waveforms: false })

    expect(summaryOnly).toHaveLength(3)
    expect(summaryOnly.some((file) => file.path.includes('DATALOG'))).toBe(false)
  })
})

describe('reading a synthetic card back through the real importer', () => {
  const night = planNight(SEED, DATE)
  const card = importPapData(writeSyntheticCard({ seed: SEED, dates: [DATE] }))

  it('recognises it as a ResMed card', () => {
    expect(card.brand).toBe('resmed')
  })

  it('identifies the device the card claims to come from', () => {
    expect(card.device?.productCode).toBe('39410')
    expect(card.device?.modelNumber).toBe(39410)
    expect(card.device?.serialNumber).toBe('00000000001')
  })

  it('reads nothing it could not parse', () => {
    expect(card.unreadable).toEqual([])
  })

  it('files the whole night under the therapy day it started, noon to noon', () => {
    expect(card.days.map((day) => day.date)).toEqual([DATE])
  })

  it('recovers one session per session the night planned', () => {
    expect(card.days[0].sessions).toHaveLength(night.sessions.length)
  })

  it('recovers the summary the writer put in STR, not a recomputed one', () => {
    const summary = card.days[0].summary

    expect(summary).not.toBeNull()
    expect(summary?.ahi).toBeCloseTo(night.summary.ahi!, 1)
    expect(summary?.usageMinutes).toBeCloseTo(night.summary.usageMinutes!, 0)
    expect(summary?.maskEvents).toBe(night.summary.maskEvents)
  })

  it('recovers the leak statistics in litres per minute, applying the device conversion', () => {
    const summary = card.days[0].summary

    expect(summary?.leak.percentile95).toBeCloseTo(night.summary.leak.percentile95!, 0)
  })

  it('recovers tidal volume in millilitres, applying the device conversion', () => {
    const summary = card.days[0].summary

    expect(summary?.tidalVolume.median).toBeCloseTo(night.summary.tidalVolume.median!, -1)
  })

  it('decodes the AirSense 11 enums rather than reporting an unknown', () => {
    const settings = card.days[0].settings

    expect(settings?.mode).toBe('AutoSet')
    expect(settings?.maskType).toBe('Full Face')
    expect(settings?.eprType).toBe('Full Time')
    expect(settings?.rampMode).toBe('Auto')
    expect(settings?.patientAccess).toBe('Advanced')
    expect(settings?.climateControl).toBe('Auto')
    expect(settings?.humidifierEnabled).toBe('On')
    expect(JSON.stringify(settings)).not.toContain('Unknown')
  })

  it('recovers the pressure bounds the mode declares', () => {
    const settings = card.days[0].settings

    expect(settings?.minPressure).toBeCloseTo(night.settings.minPressure ?? 0, 1)
    expect(settings?.maxPressure).toBeCloseTo(night.settings.maxPressure ?? 0, 1)
    expect(settings?.setPressure).toBeNull()
  })

  it('recovers every scored event the night planted', () => {
    const recovered = card.days[0].sessions.flatMap((session) => session.events)

    expect(recovered).toHaveLength(night.events.length)
  })

  it('puts each event back where the night planted it, because the card flags one at its end', () => {
    const recovered = card.days[0].sessions
      .flatMap((session) => session.events)
      .filter((event) => event.type !== 'periodicBreathing')
      .sort((a, b) => a.startMs - b.startMs)
    const planted = night.events
      .filter((event) => event.type !== 'periodicBreathing')
      .sort((a, b) => a.startMs - b.startMs)

    expect(recovered).toHaveLength(planted.length)
    for (const [index, event] of recovered.entries()) {
      expect(event.type, `event #${index}`).toBe(planted[index].type)
      // A session is named by a filename clock of whole seconds, and its end and duration are each
      // written to a tenth of one, so the round trip can only be as sharp as those three together.
      // Reading the flag as a start rather than an end would be out by the event's own length, which
      // is tens of seconds.
      expect(Math.abs(event.startMs - planted[index].startMs), `${event.type} #${index} start`).toBeLessThan(
        SECOND_MS + ANNOTATION_TENTH_MS,
      )
      expect(
        Math.abs(event.durationMs - planted[index].durationMs),
        `${event.type} #${index} duration`,
      ).toBeLessThanOrEqual(ANNOTATION_TENTH_MS)
    }
  })

  it('recovers how long each run of periodic breathing lasted, which the card only writes as two flags', () => {
    const recovered = card.days[0].sessions
      .flatMap((session) => session.events)
      .filter((event) => event.type === 'periodicBreathing')
    const planted = night.events.filter((event) => event.type === 'periodicBreathing')

    expect(recovered).toHaveLength(planted.length)
    expect(recovered.length).toBeGreaterThan(0)
    recovered.forEach((event, index) => {
      expect(event.durationMs).toBeGreaterThan(0)
      expect(Math.abs(event.durationMs - planted[index].durationMs)).toBeLessThanOrEqual(2 * ANNOTATION_TENTH_MS)
    })
  })

  it('recovers each event type under the name the reader maps it to', () => {
    const recovered = card.days[0].sessions.flatMap((session) => session.events)
    const counts = (events: { type: string }[]) =>
      events.reduce<Record<string, number>>((total, event) => {
        total[event.type] = (total[event.type] ?? 0) + 1
        return total
      }, {})

    expect(counts(recovered)).toEqual(counts(night.events))
  })

  it('drops the oximetry channels, because the writer left them entirely as the no data marker', () => {
    const ids = card.days[0].sessions.flatMap((session) => session.channels.map((channel) => channel.id))

    expect(ids).not.toContain('pulse')
    expect(ids).not.toContain('oxygenSaturation')
  })

  it('recovers the flow trace at the finer of the two intervals the card carries', () => {
    const flow = card.days[0].sessions[0].channels.find((channel) => channel.id === 'flow')

    expect(flow?.intervalMs).toBe(40)
    expect(flow?.unit).toBe('L/min')
    expect(flow!.values.length).toBeGreaterThan(1000)
  })

  it('recovers flow in litres per minute, so the chart is not out by a factor of sixty', () => {
    const flow = card.days[0].sessions[0].channels.find((channel) => channel.id === 'flow')
    let peak = 0
    for (const value of flow!.values) peak = Math.max(peak, Math.abs(value))

    expect(peak).toBeGreaterThan(10)
    expect(peak).toBeLessThan(200)
  })

  it('recovers the slower channels at their own interval', () => {
    const channels = card.days[0].sessions[0].channels
    const leak = channels.find((channel) => channel.id === 'leak')
    const rate = channels.find((channel) => channel.id === 'respiratoryRate')

    expect(leak?.intervalMs).toBe(2000)
    expect(leak?.unit).toBe('L/min')
    expect(rate?.intervalMs).toBe(2000)
  })
})

describe('reading a month of synthetic nights back', () => {
  const dates = Array.from({ length: 30 }, (_, index) => format(deviceTime(2026, 7, 2 + index, 12), 'yyyy-MM-dd'))
  const card = importPapData(writeSyntheticCard({ seed: SEED, dates, waveforms: false }))

  it('files thirty nights as thirty therapy days, which a single day card could never catch', () => {
    expect(card.days).toHaveLength(30)
    expect(card.days.map((day) => day.date)).toEqual(dates)
  })

  it('gives every one of those days its own summary', () => {
    for (const day of card.days) {
      expect(day.summary, `no summary for ${day.date}`).not.toBeNull()
    }
  })

  it('carries a different AHI on most of those days', () => {
    const values = card.days.map((day) => day.summary?.ahi)

    expect(new Set(values).size).toBeGreaterThan(20)
  })
})
