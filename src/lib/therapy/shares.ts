import { addMinutes } from 'date-fns'

export const MINUTES_PER_HOUR = 60
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

/**
 * A link is meant to be opened while the reader is looking, so the ladder runs from a quarter of an
 * hour to three days and no further.
 */
export const SHARE_DURATION_MINUTES = [15, 60, 240, 720, MINUTES_PER_DAY, 3 * MINUTES_PER_DAY] as const

export type ShareDurationMinutes = (typeof SHARE_DURATION_MINUTES)[number]

export const DEFAULT_SHARE_DURATION_MINUTES: ShareDurationMinutes = 60

export const MAX_ACTIVE_SHARES = 5

const SHARE_PATH = '/share'

export interface ShareLink {
  id: string
  expiresAt: Date
}

export function parseShareDuration(value: unknown): ShareDurationMinutes | null {
  return SHARE_DURATION_MINUTES.find((minutes) => minutes === value) ?? null
}

/**
 * A link lasts a fixed number of minutes rather than a calendar span, so a clock change in the
 * holder's country cannot lengthen or shorten the access the owner granted.
 */
export function shareExpiry(minutes: ShareDurationMinutes, nowMs: number): Date {
  return addMinutes(nowMs, minutes)
}

export function isShareActive(share: { expiresAt: Date }, nowMs: number): boolean {
  return share.expiresAt.getTime() > nowMs
}

export function shareUrl(origin: string, token: string): string {
  return `${origin}${SHARE_PATH}/${token}`
}
