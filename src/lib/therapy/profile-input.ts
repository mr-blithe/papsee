import { isPapDayKey } from '@/lib/pap'
import { calendarDayKey, papDayKey } from '@/lib/pap/device-time'
import { isDeviceGuideId } from './device-guides'
import type { PatientProfile } from './repository'

export const PROFILE_LIMITS = {
  earliestBirthDate: '1900-01-01',
  heightCm: { min: 50, max: 260 },
  weightKg: { min: 20, max: 400 },
  diagnosisAhi: { min: 0, max: 200 },
} as const

/**
 * Reading the clock inside a component body is an impure render, which React's rules forbid, so a page
 * calls this and passes the answer down. A date bound on a form is a calendar date, not a therapy day.
 */
export function todayKey(): string {
  return calendarDayKey(Date.now())
}

function optionalNumber(value: unknown, range: { min: number; max: number }, integer: boolean): number | null | false {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  if (integer && !Number.isInteger(value)) return false
  if (value < range.min || value > range.max) return false
  return value
}

function optionalDayKey(value: unknown, bounds?: { earliest: string; latest: string }): string | null | false {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || !isPapDayKey(value)) return false
  if (bounds && (value < bounds.earliest || value > bounds.latest)) return false
  return value
}

function optionalDeviceGuide(value: unknown): string | null | false {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return isDeviceGuideId(trimmed) ? trimmed : false
}

export function parseProfileInput(body: unknown): PatientProfile | null {
  if (body === null || typeof body !== 'object') return null

  const input = body as Record<string, unknown>
  const bornOn = optionalDayKey(input.bornOn, {
    earliest: PROFILE_LIMITS.earliestBirthDate,
    latest: papDayKey(Date.now()),
  })
  const heightCm = optionalNumber(input.heightCm, PROFILE_LIMITS.heightCm, true)
  const weightKg = optionalNumber(input.weightKg, PROFILE_LIMITS.weightKg, false)
  const diagnosisAhi = optionalNumber(input.diagnosisAhi, PROFILE_LIMITS.diagnosisAhi, false)
  const diagnosedOn = optionalDayKey(input.diagnosedOn)
  const deviceGuide = optionalDeviceGuide(input.deviceGuide)

  if (
    bornOn === false ||
    heightCm === false ||
    weightKg === false ||
    diagnosisAhi === false ||
    diagnosedOn === false ||
    deviceGuide === false
  ) {
    return null
  }

  return { bornOn, heightCm, weightKg, diagnosedOn, diagnosisAhi, deviceGuide }
}

export function patientAge(bornOn: string, todayKey: string): number | null {
  if (!isPapDayKey(bornOn) || !isPapDayKey(todayKey) || bornOn > todayKey) return null

  const [bornYear, bornMonth, bornDay] = bornOn.split('-').map(Number)
  const [year, month, day] = todayKey.split('-').map(Number)
  const hadBirthday = month > bornMonth || (month === bornMonth && day >= bornDay)

  return year - bornYear - (hadBirthday ? 0 : 1)
}
