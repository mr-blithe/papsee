import { papDayKey } from '@/lib/pap/device-time'

const DAY_MS = 86_400_000
const NOON = 'T12:00:00Z'
const PERCENTILE = 0.95

export interface TrendSummary {
  average: number | null
  percentile95: number | null
  nights: number
}

export interface DayWindow {
  from: string
  to: string
}

export function dayKeyToNoonMs(date: string): number {
  return Date.parse(`${date}${NOON}`)
}

export function shiftDayKey(date: string, byDays: number): string {
  return papDayKey(dayKeyToNoonMs(date) + byDays * DAY_MS)
}

export function daysBetween(window: DayWindow): number {
  return Math.round((dayKeyToNoonMs(window.to) - dayKeyToNoonMs(window.from)) / DAY_MS) + 1
}

export function previousWindow(window: DayWindow): DayWindow {
  const length = daysBetween(window)

  return { from: shiftDayKey(window.from, -length), to: shiftDayKey(window.from, -1) }
}

export function summariseTrend(values: (number | null | undefined)[]): TrendSummary {
  const present = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (present.length === 0) return { average: null, percentile95: null, nights: 0 }

  const sorted = [...present].sort((a, b) => a - b)
  const rank = Math.max(1, Math.ceil(PERCENTILE * sorted.length))

  return {
    average: present.reduce((total, value) => total + value, 0) / present.length,
    percentile95: sorted[rank - 1],
    nights: present.length,
  }
}

export function percentageChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null

  return ((current - previous) / previous) * 100
}

export function linearTrend(values: (number | null)[]): number[] | null {
  const present = values.flatMap((value, index) => (typeof value === 'number' ? [{ index, value }] : []))
  if (present.length < 2) return null

  const meanIndex = present.reduce((total, point) => total + point.index, 0) / present.length
  const meanValue = present.reduce((total, point) => total + point.value, 0) / present.length

  let covariance = 0
  let variance = 0
  for (const point of present) {
    covariance += (point.index - meanIndex) * (point.value - meanValue)
    variance += (point.index - meanIndex) ** 2
  }

  const slope = variance === 0 ? 0 : covariance / variance
  const intercept = meanValue - slope * meanIndex

  return values.map((_value, index) => slope * index + intercept)
}
