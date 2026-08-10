import { NextIntlClientProvider } from 'next-intl'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import en from '@/../messages/en.json'
import type { DaySettings } from '@/lib/pap'
import { DaySettingsCard } from './settings-panel'

const UNKNOWN = 'Unknown'

function settingsWith(overrides: Partial<DaySettings>): DaySettings {
  return {
    mode: UNKNOWN,
    setPressure: null,
    minPressure: null,
    maxPressure: null,
    startPressure: null,
    eprEnabled: UNKNOWN,
    eprType: UNKNOWN,
    eprLevel: null,
    rampMode: UNKNOWN,
    rampMinutes: null,
    smartStart: UNKNOWN,
    maskType: UNKNOWN,
    antibacterialFilter: UNKNOWN,
    humidifierEnabled: UNKNOWN,
    humidifierLevel: null,
    climateControl: UNKNOWN,
    heatedTube: UNKNOWN,
    tubeTemperature: null,
    patientAccess: UNKNOWN,
    ...overrides,
  }
}

function render(settings: DaySettings): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <DaySettingsCard settings={settings} />
    </NextIntlClientProvider>,
  )
}

describe('what the night reports about the humidifier', () => {
  it('does not claim it was off when the card never said either way', () => {
    const markup = render(settingsWith({ humidifierEnabled: UNKNOWN }))

    expect(markup).toContain(UNKNOWN)
    expect(markup).not.toContain(`>${en.Settings.off}<`)
  })

  it('still reports off when the card actually said off', () => {
    const markup = render(settingsWith({ humidifierEnabled: 'Off' }))

    expect(markup).toContain(`>${en.Settings.off}<`)
  })

  it('reports the level the card wrote when the humidifier was running', () => {
    const markup = render(settingsWith({ humidifierEnabled: 'On', humidifierLevel: 4 }))

    expect(markup).toContain('Level 4')
  })
})
