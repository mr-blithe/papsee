export const AHI_SEVERITY_IDS = ['normal', 'mild', 'moderate', 'severe'] as const

export type AhiSeverity = (typeof AHI_SEVERITY_IDS)[number]

export interface AhiSeverityBand {
  id: AhiSeverity
  from: number
  to: number | null
}

export const AHI_SEVERITY_BANDS: readonly AhiSeverityBand[] = [
  { id: 'normal', from: 0, to: 5 },
  { id: 'mild', from: 5, to: 15 },
  { id: 'moderate', from: 15, to: 30 },
  { id: 'severe', from: 30, to: null },
]

export function severityBand(ahi: number): AhiSeverityBand {
  let match = AHI_SEVERITY_BANDS[0]
  for (const band of AHI_SEVERITY_BANDS) {
    if (ahi >= band.from) match = band
  }
  return match
}

export function ahiSeverity(ahi: number): AhiSeverity {
  return severityBand(ahi).id
}
