import { assignFilesToDays, buildDigitalDay, importPapData, readCardMetadata } from '@/lib/pap'
import type { DayPayloadCard } from '@/lib/pap/day-payload'
import type { DigitalDay } from '@/lib/pap/digital'
import { papDayKey } from '@/lib/pap/device-time'
import { writeSyntheticCard } from '@/lib/pap/synthetic/card'
import { toDayIndexRow } from './day-index'
import type { DayIndexEntry, ExportedDay, PatientProfile } from './repository'

const DEMO_SEED = 'papsee-example'
const DEMO_NIGHTS = 30
const DAY_MS = 86_400_000

export const DEMO_PROFILE: PatientProfile = {
  bornOn: '1978-04-22',
  heightCm: 178,
  weightKg: 92,
  diagnosedOn: '2024-03-14',
  diagnosisAhi: 34.2,
  deviceGuide: 'resmedAirSense11',
}

function demoDates(nowMs: number): string[] {
  const lastNoonMs = Date.parse(`${papDayKey(nowMs)}T12:00:00Z`)

  return Array.from({ length: DEMO_NIGHTS }, (_, index) => papDayKey(lastNoonMs - (DEMO_NIGHTS - 1 - index) * DAY_MS))
}

/**
 * The example card is written without waveforms, so its nights carry the summary block the device
 * writes per day but no sessions and no scored events. Generating those would mean building a month
 * of full recordings on every request.
 */
export function demoDaysForExport(nowMs: number): ExportedDay[] {
  const card = writeSyntheticCard({ seed: DEMO_SEED, dates: demoDates(nowMs), waveforms: false })

  return importPapData(card)
    .days.map(toDayIndexRow)
    .map((row) => ({
      date: row.date,
      startMs: row.startMs,
      endMs: row.endMs,
      usageMinutes: row.usageMinutes,
      ahi: row.ahi,
      oai: row.oai,
      cai: row.cai,
      hi: row.hi,
      reraIndex: row.reraIndex,
      leakP95: row.leakP95,
      pressureP95: row.pressureP95,
      sessionCount: row.sessionBounds.length,
      summary: row.summary,
      settings: row.settings,
      sessionBounds: row.sessionBounds,
      events: row.events,
    }))
}

export function demoDayIndex(nowMs: number): DayIndexEntry[] {
  return demoDaysForExport(nowMs).map((day) => ({
    date: day.date,
    startMs: day.startMs,
    endMs: day.endMs,
    usageMinutes: day.usageMinutes,
    ahi: day.ahi,
    oai: day.oai,
    cai: day.cai,
    hi: day.hi,
    reraIndex: day.reraIndex,
    leakP95: day.leakP95,
    pressureP95: day.pressureP95,
    sessionCount: day.sessionCount,
  }))
}

export function demoDay(nowMs: number, date: string): { card: DayPayloadCard; day: DigitalDay } | null {
  const dates = demoDates(nowMs)
  if (!dates.includes(date)) return null

  const cardLevel = writeSyntheticCard({ seed: DEMO_SEED, dates, waveforms: false })
  const night = writeSyntheticCard({ seed: DEMO_SEED, dates: [date], waveforms: true })
  const assignment = assignFilesToDays(night.map((file) => file.path))
  const metadata = readCardMetadata(cardLevel)
  const summary = metadata.daySummaries.find((candidate) => candidate.date === date) ?? null
  const built = buildDigitalDay(
    'resmed',
    date,
    night.filter((file) => assignment.get(file.path) === date),
    summary,
  )

  return {
    card: {
      brand: metadata.brand,
      device: metadata.device,
      settingGroups: metadata.settingGroups,
      unreadable: [...metadata.unreadable, ...built.unreadable],
    },
    day: built.day,
  }
}
