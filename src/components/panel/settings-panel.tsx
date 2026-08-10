'use client'

import { useTranslations } from 'next-intl'
import { DEVICE_LANGUAGE, type DaySettings, type SettingGroup } from '@/lib/pap'
import type { TermId } from '@/lib/terms'
import { DataList, PanelCard, PanelCardHeader } from './panel-card'

type Translate = ReturnType<typeof useTranslations<'Settings'>>

const NOT_RECORDED = '-'

function therapyItems(settings: DaySettings, t: Translate) {
  const items: { label: string; value: string; term?: TermId }[] = [
    { label: t('mode'), value: settings.mode ?? NOT_RECORDED },
  ]

  if (settings.setPressure !== null) {
    items.push({ label: t('setPressure'), value: `${settings.setPressure.toFixed(1)} cmH2O` })
  }
  if (settings.minPressure !== null && settings.maxPressure !== null) {
    items.push({ label: t('minPressure'), value: `${settings.minPressure.toFixed(1)} cmH2O` })
    items.push({ label: t('maxPressure'), value: `${settings.maxPressure.toFixed(1)} cmH2O` })
  }

  items.push(
    { label: t('startPressure'), value: `${settings.startPressure?.toFixed(1) ?? NOT_RECORDED} cmH2O` },
    {
      label: t('epr'),
      term: settings.eprType === 'Off' ? undefined : ('eprFullTime' as const),
      value:
        settings.eprType === 'Off'
          ? t('off')
          : settings.eprLevel === null
            ? settings.eprType
            : t('eprLevel', { type: settings.eprType, level: settings.eprLevel }),
    },
    {
      label: t('ramp'),
      value:
        settings.rampMinutes === null
          ? settings.rampMode
          : t('rampMinutes', { mode: settings.rampMode, minutes: settings.rampMinutes }),
    },
    { label: t('smartStart'), value: settings.smartStart },
    { label: t('mask'), value: settings.maskType },
    { label: t('antibacterialFilter'), value: settings.antibacterialFilter },
    {
      label: t('humidifier'),
      value:
        settings.humidifierEnabled === 'Off'
          ? t('off')
          : settings.humidifierLevel === null
            ? settings.humidifierEnabled
            : t('humidifierLevel', { level: settings.humidifierLevel }),
    },
    { label: t('climateControl'), value: settings.climateControl },
    {
      label: t('heatedTube'),
      value:
        settings.heatedTube === 'Off'
          ? t('off')
          : settings.tubeTemperature === null
            ? settings.heatedTube
            : t('heatedTubeTemperature', {
                mode: settings.heatedTube,
                temperature: settings.tubeTemperature.toFixed(0),
              }),
    },
    { label: t('patientView'), value: settings.patientAccess },
  )

  return items
}

export function DaySettingsCard({ settings }: { settings: DaySettings | null }) {
  const t = useTranslations('Settings')

  if (!settings) return null

  return (
    <PanelCard>
      <PanelCardHeader title={t('dayTitle')} description={t('dayDescription')} />
      <div className="px-5 py-4">
        <DataList items={therapyItems(settings, t)} />
      </div>
    </PanelCard>
  )
}

export function CurrentSettingsCard({ groups }: { groups: SettingGroup[] }) {
  const t = useTranslations('Settings')

  if (groups.length === 0) return null

  return (
    <PanelCard>
      <PanelCardHeader title={t('currentTitle')} description={t('currentDescription')} />
      <div lang={DEVICE_LANGUAGE} className="space-y-5 px-5 py-4">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.title}</h3>
            <DataList items={group.entries} />
          </div>
        ))}
      </div>
    </PanelCard>
  )
}
