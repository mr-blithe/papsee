'use client'

import { useTranslations } from 'next-intl'
import type { ChannelId, DaySummary, StatSummary } from '@/lib/pap'
import type { TermId } from '@/lib/terms'
import { PanelCard, PanelCardHeader } from './panel-card'
import { TermHint } from './term-hint'

const NOT_RECORDED = '-'

function reading(value: number | null, decimals: number): string {
  return value === null ? NOT_RECORDED : value.toFixed(decimals)
}

interface Row {
  key: TermId
  channel?: ChannelId
  unit: string
  stat: StatSummary
  decimals: number
}

function rows(summary: DaySummary): Row[] {
  return [
    { key: 'maskPressure', channel: 'maskPressure', unit: 'cmH2O', stat: summary.maskPressure, decimals: 2 },
    { key: 'targetEpap', unit: 'cmH2O', stat: summary.targetEpap, decimals: 2 },
    { key: 'leak', channel: 'leak', unit: 'L/min', stat: summary.leak, decimals: 1 },
    { key: 'respiratoryRate', channel: 'respiratoryRate', unit: 'bpm', stat: summary.respiratoryRate, decimals: 1 },
    { key: 'tidalVolume', channel: 'tidalVolume', unit: 'mL', stat: summary.tidalVolume, decimals: 0 },
    {
      key: 'minuteVentilation',
      channel: 'minuteVentilation',
      unit: 'L/min',
      stat: summary.minuteVentilation,
      decimals: 2,
    },
  ]
}

export function StatisticsCard({ summary }: { summary: DaySummary | null }) {
  const t = useTranslations('Statistics')
  const channels = useTranslations('Channels')

  if (!summary) return null

  return (
    <PanelCard>
      <PanelCardHeader title={t('title')} description={t('description')} />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">{t('signal')}</th>
              <th className="px-2 py-2 text-right font-medium">
                <span className="inline-flex items-center gap-1">
                  {t('median')}
                  <TermHint term="median" />
                </span>
              </th>
              <th className="px-2 py-2 text-right font-medium">
                <span className="inline-flex items-center gap-1">
                  {t('percentile95')}
                  <TermHint term="percentile95" />
                </span>
              </th>
              <th className="px-4 py-2 text-right font-medium">{t('max')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows(summary).map((row) => (
              <tr key={row.key} className="tabular-nums">
                <td className="px-4 py-2">
                  <span className="flex items-center gap-1.5">
                    {row.channel ? channels(row.channel) : t('targetEpap')}
                    <TermHint term={row.key} />
                  </span>
                  <span className="text-muted-foreground">{row.unit}</span>
                </td>
                <td className="px-2 py-2 text-right">{reading(row.stat.median, row.decimals)}</td>
                <td className="px-2 py-2 text-right">{reading(row.stat.percentile95, row.decimals)}</td>
                <td className="px-4 py-2 text-right">{reading(row.stat.max, row.decimals)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelCard>
  )
}

export function EnvironmentCard({ summary }: { summary: DaySummary | null }) {
  const t = useTranslations('Statistics')

  if (!summary) return null

  const readings = [
    { key: 'ambientHumidity', value: reading(summary.ambientHumidity, 1), unit: 'mg/L' },
    { key: 'humidifierTemperature', value: reading(summary.humidifierTemperature, 1), unit: '°C' },
    { key: 'periodicBreathing', value: reading(summary.csrMinutes, 0), unit: t('minutes') },
    { key: 'maskEvents', value: reading(summary.maskEvents, 0), unit: undefined },
  ] as const

  return (
    <PanelCard>
      <PanelCardHeader title={t('environmentTitle')} description={t('environmentDescription')} />
      <div className="grid grid-cols-2 gap-4 px-4 py-4">
        {readings.map((reading) => (
          <div key={reading.key}>
            <p className="text-xs text-muted-foreground">{t(reading.key)}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {reading.value}{' '}
              {reading.unit ? <span className="text-xs font-normal text-muted-foreground">{reading.unit}</span> : null}
            </p>
          </div>
        ))}
      </div>
    </PanelCard>
  )
}
