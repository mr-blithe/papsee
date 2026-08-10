import { UTCDate } from '@date-fns/utc'
import { format, isValid, parse, subHours } from 'date-fns'

const NOON_HOUR = 12
const DAY_KEY_FORMAT = 'yyyy-MM-dd'

export const DEVICE_TIME_ZONE = 'UTC'

/**
 * A PAP device writes wall clock readings with no time zone, so every one of them is anchored to UTC
 * here. Reading them in the runtime's own zone would move a night whenever the parse and the render
 * happen in different places.
 */
export function deviceTime(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): UTCDate {
  return new UTCDate(year, month - 1, day, hour, minute, second)
}

export function deviceTimeAt(atMs: number): UTCDate {
  return new UTCDate(atMs)
}

export function papDayKey(atMs: number): string {
  return format(subHours(deviceTimeAt(atMs), NOON_HOUR), DAY_KEY_FORMAT)
}

export function papDayDate(key: string): UTCDate {
  return parse(key, DAY_KEY_FORMAT, deviceTimeAt(0))
}

/**
 * The date on the face of the clock, with no noon to noon shift. A therapy day belongs to the night
 * it started, so `papDayKey` is the wrong reading for a birthday or a range a reader picked out of a
 * calendar.
 */
export function calendarDayKey(atMs: number): string {
  return format(deviceTimeAt(atMs), DAY_KEY_FORMAT)
}

export function isPapDayKey(value: string): boolean {
  const parsed = papDayDate(value)
  return isValid(parsed) && format(parsed, DAY_KEY_FORMAT) === value
}
