import type { CardBrand } from '@/lib/pap'

export const DEVICE_GUIDE_IDS = [
  'resmedAirSense11',
  'resmedAirSense10',
  'resmedAirCurve',
  'resmedS9',
  'lowensteinPrismaSmart',
  'other',
] as const

export type DeviceGuideId = (typeof DEVICE_GUIDE_IDS)[number]

export function isDeviceGuideId(value: string): value is DeviceGuideId {
  return (DEVICE_GUIDE_IDS as readonly string[]).includes(value)
}

/**
 * How far a device has actually been taken, which is not the same question as whether its card imports.
 * `verified` means real card bytes from that family were read back; `read` means the format is implemented
 * and covered by synthetic tests but no real card has been seen. See DEVICE-COVERAGE.md.
 */
export type DeviceCoverage = 'verified' | 'read' | 'unknown'

export const DEVICE_COVERAGE: Record<DeviceGuideId, DeviceCoverage> = {
  resmedAirSense11: 'verified',
  resmedAirSense10: 'read',
  resmedAirCurve: 'read',
  resmedS9: 'read',
  lowensteinPrismaSmart: 'read',
  other: 'unknown',
}

/**
 * How far a **brand** has been taken, which is a different question from the one `DEVICE_COVERAGE`
 * answers and legitimately disagrees with it. This one asks whether any device of the brand has been
 * read back from a real card, so ResMed is verified because the AirSense 11 is. Keyed the other way a
 * ResMed reader would be warned about a family that has been verified.
 */
export const BRAND_COVERAGE: Partial<Record<CardBrand, DeviceCoverage>> = {
  resmed: 'verified',
  lowensteinPrisma: 'read',
}
