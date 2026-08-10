export const DEVICE_GUIDE_IDS = ['resmedAirSense11', 'resmedAirSense10', 'resmedAirCurve', 'resmedS9', 'other'] as const

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
  other: 'unknown',
}
