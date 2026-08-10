import { describe, expect, it } from 'vitest'
import { parseCurrentSettings } from './settings'

function settingsJson(feature: string, profile: Record<string, unknown>): string {
  return JSON.stringify({
    FlowGenerator: {
      SettingProfiles: {
        ActiveProfiles: { FeatureProfiles: [feature] },
        FeatureProfiles: { [feature]: profile },
      },
    },
  })
}

function labels(feature: string, profile: Record<string, unknown>): string[] {
  return parseCurrentSettings(settingsJson(feature, profile))[0].entries.map((entry) => entry.label)
}

describe('reading the settings a device says it is running on', () => {
  it('keeps an acronym an acronym, so a reader is not shown Epr where the device means EPR', () => {
    expect(labels('EprFeature', { EprEnable: 'On', EprType: 'FullTime', EprEnablePatientAccess: 'On' })).toEqual([
      'EPR Enable',
      'EPR Type',
      'EPR Enable Patient Access',
    ])
  })

  it('leaves an ordinary word alone, so nothing else is shouted at the reader', () => {
    expect(labels('ClimateFeature', { HeatedTubeTemperature: 27, ClimateControl: 'Auto' })).toEqual([
      'Heated Tube Temperature',
      'Climate Control',
    ])
  })

  it('titles a group from the profile the device named it with', () => {
    const groups = parseCurrentSettings(settingsJson('EprFeature', { EprType: 'FullTime' }))

    expect(groups[0].title).toBe('Expiratory pressure relief')
  })
})
