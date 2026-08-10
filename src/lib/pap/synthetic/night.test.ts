import { describe, expect, it } from 'vitest'
import { LARGE_LEAK_THRESHOLD } from '../resmed/channels'
import { eventIndices, truncateToTenth } from '../stats'
import { planNight, planNights } from './night'

const SEED = 'papsee-example-user'
const DATE = '2026-07-14'

const DAY_MS = 24 * 60 * 60 * 1000

function noonOf(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day, 12, 0, 0, 0)
}

describe('a synthetic night is reproducible', () => {
  it('returns the identical night for the same seed and date, so a trend does not reshuffle on every request', () => {
    const first = planNight(SEED, DATE)
    const second = planNight(SEED, DATE)

    expect(second.sessions).toEqual(first.sessions)
    expect(second.events).toEqual(first.events)
    expect(second.summary).toEqual(first.summary)
    expect(second.sample('flow', first.sessions[0].startMs + 12_345)).toBe(
      first.sample('flow', first.sessions[0].startMs + 12_345),
    )
  })

  it('returns a different night for a different date', () => {
    const monday = planNight(SEED, '2026-07-13')
    const tuesday = planNight(SEED, '2026-07-14')

    expect(tuesday.summary.ahi).not.toBe(monday.summary.ahi)
  })

  it('returns a different history for a different seed, so two example users do not share a night', () => {
    expect(planNight('other-persona', DATE).summary.ahi).not.toBe(planNight(SEED, DATE).summary.ahi)
  })
})

describe('a synthetic night sits inside its own therapy day', () => {
  const night = planNight(SEED, DATE)

  it('reports the noon that opens the therapy day it is filed under', () => {
    expect(night.noonMs).toBe(noonOf(DATE))
    expect(night.date).toBe(DATE)
  })

  it('keeps every session inside the noon to noon window of that date', () => {
    for (const session of night.sessions) {
      expect(session.startMs).toBeGreaterThanOrEqual(night.noonMs)
      expect(session.startMs + session.durationMs).toBeLessThanOrEqual(night.noonMs + DAY_MS)
    }
  })

  it('puts the night after midnight, which is what makes the noon to noon rule worth testing', () => {
    const midnight = night.noonMs + 12 * 60 * 60 * 1000
    const last = night.sessions[night.sessions.length - 1]

    expect(last.startMs + last.durationMs).toBeGreaterThan(midnight)
  })

  it('orders sessions and never overlaps them', () => {
    for (let index = 1; index < night.sessions.length; index += 1) {
      const previous = night.sessions[index - 1]
      expect(night.sessions[index].startMs).toBeGreaterThanOrEqual(previous.startMs + previous.durationMs)
    }
  })

  it('places every event inside a session, never in a mask off gap', () => {
    for (const event of night.events) {
      const covering = night.sessions.find(
        (session) => event.startMs >= session.startMs && event.startMs < session.startMs + session.durationMs,
      )
      expect(covering, `event at ${event.startMs} falls outside every session`).toBeDefined()
    }
  })
})

describe('the summary a synthetic night reports about itself', () => {
  const night = planNight(SEED, DATE)

  it('reports the usage its own sessions add up to', () => {
    const recorded = night.sessions.reduce((total, session) => total + session.durationMs, 0)

    expect(night.summary.usageMinutes).toBeCloseTo(recorded / 60_000, 1)
  })

  it('reports an AHI that agrees with the events it planted, so the tile cannot contradict the event list', () => {
    const recorded = night.sessions.reduce((total, session) => total + session.durationMs, 0)
    const computed = eventIndices(night.events, recorded)

    expect(night.summary.ahi).toBe(truncateToTenth(computed.ahi))
    expect(night.summary.oai).toBe(truncateToTenth(computed.oai))
    expect(night.summary.cai).toBe(truncateToTenth(computed.cai))
    expect(night.summary.hi).toBe(truncateToTenth(computed.hi))
  })

  it('truncates its indices to a tenth the way the device does, rather than rounding', () => {
    expect(night.summary.ahi).toBe(truncateToTenth(night.summary.ahi!))
    expect(night.summary.reraIndex).toBe(truncateToTenth(night.summary.reraIndex!))
  })

  it('counts one mask event per session, which is what the device reports', () => {
    expect(night.summary.maskEvents).toBe(night.sessions.length)
  })

  it('reports leak statistics in the order the reader expects them', () => {
    expect(night.summary.leak.median!).toBeLessThanOrEqual(night.summary.leak.percentile95!)
    expect(night.summary.leak.percentile95!).toBeLessThanOrEqual(night.summary.leak.max!)
  })
})

describe('the flow waveform a synthetic night produces', () => {
  const night = planNight(SEED, DATE)

  function quietWindow(): number {
    const session = night.sessions[0]
    for (let offset = 60_000; offset < session.durationMs - 120_000; offset += 60_000) {
      const from = session.startMs + offset
      const busy = night.events.some(
        (event) => event.startMs + event.durationMs > from && event.startMs < from + 60_000,
      )
      if (!busy) return from
    }
    return session.startMs + 60_000
  }

  it('crosses zero once per breath, at the rate the respiratory rate channel reports', () => {
    const from = quietWindow()
    let crossings = 0
    let previous = night.sample('flow', from)

    for (let step = 1; step <= 1500; step += 1) {
      const value = night.sample('flow', from + step * 40)
      if (previous > 0 && value <= 0) crossings += 1
      previous = value
    }

    const reported = night.sample('respiratoryRate', from + 30_000)

    expect(crossings).toBeGreaterThan(reported - 3)
    expect(crossings).toBeLessThan(reported + 3)
  })

  it('collapses flow through an obstructive apnea, which is what makes the event visible on the chart', () => {
    const apnea = night.events.find((event) => event.type === 'obstructiveApnea' && event.durationMs > 10_000)
    expect(apnea, 'the night planted no obstructive apnea to inspect').toBeDefined()
    if (!apnea) return

    let peak = 0
    for (let at = apnea.startMs + 2000; at < apnea.startMs + apnea.durationMs - 2000; at += 40) {
      peak = Math.max(peak, Math.abs(night.sample('flow', at)))
    }

    expect(peak).toBeLessThan(4)
  })

  it('reads as no data outside every session, rather than inventing breathing with the mask off', () => {
    expect(night.sample('flow', night.noonMs + 60_000)).toBe(-1)
  })

  it('leaves the oximetry channels entirely as the no data marker, as the example device did', () => {
    const session = night.sessions[0]

    expect(night.sample('pulse', session.startMs + 60_000)).toBe(-1)
    expect(night.sample('oxygenSaturation', session.startMs + 60_000)).toBe(-1)
  })
})

describe('a month of synthetic nights', () => {
  const nights = planNights(SEED, '2026-07-31', 30)

  it('produces one night per day, ending on the requested date', () => {
    expect(nights).toHaveLength(30)
    expect(nights[29].date).toBe('2026-07-31')
    expect(nights[0].date).toBe('2026-07-02')
  })

  it('varies night to night, so a trend chart is not a flat line', () => {
    const values = nights.map((night) => night.summary.ahi)

    expect(new Set(values).size).toBeGreaterThan(20)
  })

  it('keeps every reported number inside the range a real device records', () => {
    for (const night of nights) {
      expect(night.summary.ahi).toBeGreaterThanOrEqual(0)
      expect(night.summary.ahi).toBeLessThan(80)
      expect(night.summary.usageMinutes).toBeGreaterThan(0)
      expect(night.summary.usageMinutes).toBeLessThan(14 * 60)
      expect(night.summary.leak.percentile95).toBeGreaterThanOrEqual(0)
      expect(night.summary.leak.percentile95).toBeLessThan(120)
      expect(night.summary.respiratoryRate.median).toBeGreaterThan(6)
      expect(night.summary.respiratoryRate.median).toBeLessThan(30)
      expect(night.summary.tidalVolume.median).toBeGreaterThan(150)
      expect(night.summary.tidalVolume.median).toBeLessThan(900)
    }
  })

  it('includes at least one night short enough to read as poor usage, so the overview has something to show', () => {
    expect(nights.some((night) => night.summary.usageMinutes! < 4 * 60)).toBe(true)
  })

  it('varies tidal volume from night to night, rather than converging on one number every night', () => {
    const medians = nights.map((night) => Math.round(night.summary.tidalVolume.median!))

    expect(new Set(medians).size).toBeGreaterThan(12)
  })

  it('varies the respiratory rate a patient breathes at from night to night', () => {
    const medians = nights.map((night) => Math.round(night.summary.respiratoryRate.median! * 10))

    expect(new Set(medians).size).toBeGreaterThan(12)
  })

  it('keeps the mask sealed on most nights, so a large leak still reads as the exception', () => {
    const leaking = nights.filter((night) => night.summary.leak.percentile95! >= LARGE_LEAK_THRESHOLD)

    expect(leaking.length).toBeGreaterThan(0)
    expect(leaking.length).toBeLessThan(nights.length / 3)
  })

  it('keeps pressure inside the bounds its own settings declare, so the chart cannot contradict the settings card', () => {
    for (const night of nights) {
      const { minPressure, maxPressure } = night.settings

      expect(minPressure).not.toBeNull()
      expect(maxPressure).not.toBeNull()
      expect(night.summary.maskPressure.max).toBeLessThanOrEqual((maxPressure ?? 0) + 0.5)
      expect(night.summary.maskPressure.median).toBeGreaterThanOrEqual((minPressure ?? 0) - 0.5)
    }
  })

  it('reports an automatically adjusting mode, which is what makes a varying pressure honest', () => {
    for (const night of nights) {
      expect(night.settings.mode).toBe('AutoSet')
      expect(night.settings.setPressure).toBeNull()
    }
  })

  it('spans more than one severity band across the month', () => {
    const bands = new Set(nights.map((night) => (night.summary.ahi! < 5 ? 'normal' : 'raised')))

    expect(bands.size).toBe(2)
  })
})
