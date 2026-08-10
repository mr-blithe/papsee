'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import {
  allEvents,
  channelAverage,
  eventIndices,
  formatDuration,
  sessionDurationMs,
  truncateToTenth,
  type PapDay,
} from '@/lib/pap'
import type { AhiSeverity } from '@/lib/pap/severity'
import type { TermId } from '@/lib/terms'
import { cn } from '@/lib/utils'
import { PanelCard } from './panel-card'
import { TermHint } from './term-hint'

export function Tile({
  label,
  term,
  valueLabel,
  value,
  unit,
  aside,
  detail,
  className,
  valueClassName,
}: {
  label: string
  term?: TermId
  valueLabel?: string
  value: ReactNode
  unit?: string
  aside?: ReactNode
  detail?: ReactNode
  className?: string
  valueClassName?: string
}) {
  return (
    <PanelCard className={cn('px-5 py-4', className)}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        {term ? <TermHint term={term} /> : null}
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {valueLabel ? <span>{valueLabel}</span> : null}
        <span className={cn('text-2xl font-semibold tracking-tight tabular-nums', valueClassName)}>{value}</span>
        {unit ? <span>{unit}</span> : null}
        {aside}
      </div>
      {detail ? <div className="mt-2 text-xs text-muted-foreground">{detail}</div> : null}
    </PanelCard>
  )
}

export function StatLine({ items }: { items: { label: string; term?: TermId; value: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1 tabular-nums">
          <span>{item.label}</span>
          {item.term ? <TermHint term={item.term} /> : null}
          <span className="font-medium text-foreground">{item.value}</span>
        </li>
      ))}
    </ul>
  )
}

export function SeverityChip({ severity }: { severity: AhiSeverity }) {
  const t = useTranslations('Severity')

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 font-medium"
      style={{
        backgroundColor: `color-mix(in oklab, var(--severity-${severity}) 20%, transparent)`,
        color: `var(--severity-${severity})`,
      }}
    >
      {t(severity)}
    </span>
  )
}

export function SummaryTiles({ day, severity }: { day: PapDay; severity: AhiSeverity | null }) {
  const t = useTranslations('Summary')
  const { summary, settings } = day
  const recordedMs = sessionDurationMs(day.sessions)
  const usageMs = summary ? summary.usageMinutes * 60_000 : recordedMs
  const computed = eventIndices(allEvents(day.sessions), usageMs)

  const ahi = summary ? summary.ahi : truncateToTenth(computed.ahi)
  const leakAverage = channelAverage(day.sessions, 'leak')
  const hasRange = settings?.minPressure !== null && settings?.maxPressure !== null
  const pressureValue = settings?.setPressure
    ? settings.setPressure.toFixed(1)
    : hasRange && settings
      ? `${settings.minPressure?.toFixed(1)} - ${settings.maxPressure?.toFixed(1)}`
      : '-'

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Tile
        term="usage"
        label={t('usage')}
        value={formatDuration(usageMs)}
        detail={t('maskEvents', { count: day.sessions.length })}
      />
      <Tile
        term="ahi"
        label={t('ahi')}
        value={ahi.toFixed(1)}
        unit={t('ahiUnit')}
        valueClassName={severity ? `text-[var(--severity-${severity})]` : undefined}
        aside={
          severity ? (
            <span className="inline-flex items-center gap-1">
              <SeverityChip severity={severity} />
              <TermHint term="severity" />
            </span>
          ) : null
        }
        detail={
          <StatLine
            items={[
              {
                label: t('oai'),
                term: 'oai',
                value: (summary ? summary.oai : truncateToTenth(computed.oai)).toFixed(1),
              },
              {
                label: t('cai'),
                term: 'cai',
                value: (summary ? summary.cai : truncateToTenth(computed.cai)).toFixed(1),
              },
              { label: t('hi'), term: 'hi', value: (summary ? summary.hi : truncateToTenth(computed.hi)).toFixed(1) },
              {
                label: t('rera'),
                term: 'rera',
                value: (summary ? summary.reraIndex : truncateToTenth(computed.reraIndex)).toFixed(1),
              },
            ]}
          />
        }
      />
      <Tile
        term="epr"
        label={settings?.mode ?? t('therapy')}
        value={pressureValue}
        unit={pressureValue === '-' ? undefined : 'cmH2O'}
        detail={
          settings ? (
            settings.eprType === 'Off' ? (
              t('eprOff')
            ) : (
              <span className="inline-flex items-center gap-1">
                {t('eprOn', { type: settings.eprType, level: settings.eprLevel })}
                <TermHint term="eprFullTime" />
              </span>
            )
          ) : undefined
        }
      />
      <Tile
        term="leak"
        label={t('leak')}
        value={leakAverage === null ? '-' : leakAverage.toFixed(1)}
        unit={t('leakUnit')}
        detail={
          <StatLine
            items={[
              {
                label: t('percentile95'),
                term: 'percentile95',
                value: summary ? summary.leak.percentile95.toFixed(1) : '-',
              },
              { label: t('max'), value: summary ? summary.leak.max.toFixed(1) : '-' },
            ]}
          />
        }
      />
    </div>
  )
}
