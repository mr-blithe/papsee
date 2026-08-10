export const DEVICE_GUIDE_IDS = ['resmedAirSense11', 'resmedAirSense10', 'resmedAirCurve', 'resmedS9', 'other'] as const

export type DeviceGuideId = (typeof DEVICE_GUIDE_IDS)[number]

export function isDeviceGuideId(value: string): value is DeviceGuideId {
  return (DEVICE_GUIDE_IDS as readonly string[]).includes(value)
}
