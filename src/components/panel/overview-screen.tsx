'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  Maximize2,
  RotateCcw,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { papDayDate } from '@/lib/pap'
import { papDayKey } from '@/lib/pap/device-time'
import { AHI_SEVERITY_BANDS, ahiSeverity } from '@/lib/pap/severity'
import type { TermId } from '@/lib/terms'
import { useRouter } from '@/i18n/navigation'
import { apiErrorKey, type ApiErrorMessageKey } from '@/lib/api'
import { fetchDayIndex, TherapyApiError, type DayIndexEntry, type PatientProfile } from '@/lib/therapy/client'
import {
  dayKeyToNoonMs,
  daysBetween,
  linearTrend,
  percentageChange,
  previousWindow,
  shiftDayKey,
  summariseTrend,
  type DayWindow,
} from '@/lib/therapy/trends'
import { cn } from '@/lib/utils'
import { ChartRows, type ChartRowSpec } from './charts/chart-rows'
import type { ChartSyncKey } from './charts/signal-chart'
import { DateField } from './date-field'
import { PanelCard, PanelCardHeader } from './panel-card'
import { SeverityChip, StatLine, Tile } from './summary-tiles'
import { TermHint } from './term-hint'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const PRESETS = [7, 30, 90] as const
const ALL_PRESET = 'all'
const MINUTES_PER_HOUR = 60
const CHART_HEIGHT = 150
const FULLSCREEN_CHART_HEIGHT = 220
const AXIS_PAD = 1.12
const FLAT_CHANGE_PERCENT = 0.5
const TREND_DASH = [4, 4]

type Preset = `${(typeof PRESETS)[number]}` | typeof ALL_PRESET

interface Metric {
  id: 'usage' | 'ahi' | 'leak' | 'pressure'
  term: TermId
  color: string
  decimals: number
  lowerIsBetter: boolean
  read: (day: DayIndexEntry) => number | null
}

const METRICS: Metric[] = [
  { id: 'ahi', term: 'ahi', color: '--signal-flow', decimals: 1, lowerIsBetter: true, read: (day) => day.ahi },
  {
    id: 'usage',
    term: 'usage',
    color: '--signal-respiration',
    decimals: 1,
    lowerIsBetter: false,
    read: (day) => day.usageMinutes / MINUTES_PER_HOUR,
  },
  { id: 'leak', term: 'leak', color: '--signal-leak', decimals: 1, lowerIsBetter: true, read: (day) => day.leakP95 },
  {
    id: 'pressure',
    term: 'maskPressure',
    color: '--signal-pressure',
    decimals: 1,
    lowerIsBetter: false,
    read: (day) => day.pressureP95,
  },
]

const BREAKDOWN: { key: 'oai' | 'cai' | 'hi' | 'rera'; term: TermId; read: (day: DayIndexEntry) => number }[] = [
  { key: 'oai', term: 'oai', read: (day) => day.oai },
  { key: 'cai', term: 'cai', read: (day) => day.cai },
  { key: 'hi', term: 'hi', read: (day) => day.hi },
  { key: 'rera', term: 'rera', read: (day) => day.reraIndex },
]

function nearestNight(nights: DayIndexEntry[], atMs: number): DayIndexEntry | null {
  let closest: DayIndexEntry | null = null
  let distance = Number.POSITIVE_INFINITY

  for (const night of nights) {
    const gap = Math.abs(dayKeyToNoonMs(night.date) - atMs)
    if (gap < distance) {
      distance = gap
      closest = night
    }
  }

  return closest
}

function ChangeBadge({
  change,
  lowerIsBetter,
  label,
}: {
  change: number | null
  lowerIsBetter: boolean
  label: string
}) {
  if (change === null) return null

  const flat = Math.abs(change) < FLAT_CHANGE_PERCENT
  const rising = change > 0
  const Icon = flat ? ArrowRight : rising ? ArrowUpRight : ArrowDownRight
  const better = flat ? null : rising !== lowerIsBetter

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs',
        better === null && 'text-muted-foreground',
        better === true && 'text-[var(--severity-normal)]',
        better === false && 'text-[var(--severity-moderate)]',
      )}
      title={label}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  )
}

export function OverviewScreen({ profile }: { profile: PatientProfile | null }) {
  const t = useTranslations('Overview')
  const actions = useTranslations('Actions')
  const summaryLabels = useTranslations('Summary')
  const format = useFormatter()
  const router = useRouter()

  const [preset, setPreset] = useState<Preset>('30')
  const [custom, setCustom] = useState<DayWindow | null>(null)
  const [index, setIndex] = useState<DayIndexEntry[]>([])
  const [expanded, setExpanded] = useState(false)
  const [showTrend, setShowTrend] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorKey, setErrorKey] = useState<ApiErrorMessageKey | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const days = await fetchDayIndex()
        if (!cancelled) setIndex(days)
      } catch (error) {
        if (!cancelled) setErrorKey(apiErrorKey(error instanceof TherapyApiError ? error.code : undefined))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const window = useMemo<DayWindow | null>(() => {
    if (custom) return custom
    const last = index.at(-1)?.date
    const first = index[0]?.date
    if (!last || !first) return null
    if (preset === ALL_PRESET) return { from: first, to: last }

    return { from: shiftDayKey(last, -(Number(preset) - 1)), to: last }
  }, [custom, index, preset])

  const inWindow = useMemo(
    () => (window ? index.filter((day) => day.date >= window.from && day.date <= window.to) : []),
    [index, window],
  )

  const before = useMemo(() => (window ? previousWindow(window) : null), [window])

  const earlier = useMemo(
    () => (before ? index.filter((day) => day.date >= before.from && day.date <= before.to) : []),
    [before, index],
  )

  const diagnosisAhi = profile?.diagnosisAhi ?? null

  const rowSpecs = useMemo<Omit<ChartRowSpec, 'height'>[]>(() => {
    const x = inWindow.map((night) => dayKeyToNoonMs(night.date))

    return METRICS.map((metric) => {
      const values = inWindow.map(metric.read)
      const highest = Math.max(...values.filter((value): value is number => value !== null), 0)
      const bands =
        metric.id === 'ahi'
          ? AHI_SEVERITY_BANDS.filter((band) => band.from > 0).map((band) => ({
              value: band.from,
              color: `--severity-${band.id}`,
              label: String(band.from),
            }))
          : []
      const reference =
        metric.id === 'ahi' && diagnosisAhi
          ? [
              {
                value: diagnosisAhi,
                color: '--muted-foreground',
                label: t('diagnosisReference'),
                align: 'start' as const,
              },
            ]
          : []
      const allBands = [...bands, ...reference]
      const trendValues = showTrend ? linearTrend(values) : null

      return {
        id: metric.id,
        label: (
          <>
            {t(`metric_${metric.id}`)}
            <TermHint term={metric.term} />
          </>
        ),
        unit: t(`unit_${metric.id}`),
        x,
        lines: [{ y: values, color: metric.color }],
        trend: trendValues
          ? { y: trendValues, color: '--muted-foreground', style: 'line', dash: TREND_DASH }
          : undefined,
        yRange: [0, Math.max(highest, ...allBands.map((band) => band.value)) * AXIS_PAD || 1],
        bands: allBands.length > 0 ? allBands : undefined,
        drawStyle: 'bars',
        formatValue: (value: number) => value.toFixed(metric.decimals),
      }
    })
  }, [diagnosisAhi, inWindow, showTrend, t])

  const openDay = (date: string) => router.push(`/panel/therapy?date=${date}`)

  if (loading) {
    return (
      <PanelCard className="flex items-center gap-3 px-5 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t('loading')}
      </PanelCard>
    )
  }

  if (errorKey) {
    return (
      <PanelCard className="flex items-start gap-3 px-5 py-4 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <p className="text-muted-foreground">{t('loadFailed')}</p>
      </PanelCard>
    )
  }

  if (!window || !before) {
    return <PanelCard className="px-5 py-8 text-sm text-muted-foreground">{t('empty')}</PanelCard>
  }

  const fromMs = dayKeyToNoonMs(window.from)
  const toMs = dayKeyToNoonMs(window.to)
  const zoomed = custom !== null
  const dayLabel = (date: string) => format.dateTime(papDayDate(date), { day: 'numeric', month: 'short' })
  const comparisonLabel = (change: number) =>
    t('changePercent', { value: Math.abs(Math.round(change)), from: dayLabel(before.from), to: dayLabel(before.to) })

  const trendRows = (key: ChartSyncKey, height: number) => (
    <ChartRows
      rows={rowSpecs.map((row) => ({ ...row, height }))}
      syncKey={key}
      fromMs={fromMs}
      toMs={toMs}
      noReadingLabel={t('noReading')}
      formatCursorTime={(ms) => format.dateTime(new Date(ms), { day: 'numeric', month: 'short' })}
      onZoom={(start, end) => setCustom({ from: papDayKey(Math.min(start, end)), to: papDayKey(Math.max(start, end)) })}
      onReset={() => setCustom(null)}
      onPick={(atMs) => {
        const night = nearestNight(inWindow, atMs)
        if (night) openDay(night.date)
      }}
    />
  )

  const resetButton = zoomed ? (
    <Button variant="outline" size="sm" onClick={() => setCustom(null)}>
      <RotateCcw aria-hidden />
      {actions('resetZoom')}
    </Button>
  ) : null

  const trendToggle = (
    <Toggle variant="outline" size="sm" pressed={showTrend} onPressedChange={setShowTrend} aria-label={t('trendLine')}>
      <TrendingUp aria-hidden />
      <span className="hidden sm:inline">{t('trendLine')}</span>
    </Toggle>
  )

  return (
    <div className="space-y-3">
      <PanelCard className="flex flex-wrap items-end justify-between gap-3 px-4 py-3 md:px-5">
        <ToggleGroup
          variant="outline"
          className="flex-wrap"
          value={[custom ? 'custom' : preset]}
          onValueChange={(next) => {
            const chosen = next[0]
            if (!chosen || chosen === 'custom') return
            setCustom(null)
            setPreset(chosen as Preset)
          }}
        >
          {PRESETS.map((days) => (
            <ToggleGroupItem key={days} value={String(days)}>
              {t('presetDays', { days })}
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem value={ALL_PRESET}>{t('presetAll')}</ToggleGroupItem>
        </ToggleGroup>

        <div className="flex flex-wrap items-end gap-2">
          <div className="text-xs text-muted-foreground">
            <label htmlFor="range-from" className="block pb-1">
              {t('rangeFrom')}
            </label>
            <DateField
              id="range-from"
              value={window.from}
              min={index[0]?.date}
              max={window.to}
              onChange={(next) => next && setCustom({ from: next, to: window.to })}
              triggerClassName="w-40"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            <label htmlFor="range-to" className="block pb-1">
              {t('rangeTo')}
            </label>
            <DateField
              id="range-to"
              value={window.to}
              min={window.from}
              max={index.at(-1)?.date}
              onChange={(next) => next && setCustom({ from: window.from, to: next })}
              triggerClassName="w-40"
            />
          </div>
        </div>
      </PanelCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => {
          const now = summariseTrend(inWindow.map(metric.read))
          const then = summariseTrend(earlier.map(metric.read))
          const change = percentageChange(now.average, then.average)

          return (
            <Tile
              key={metric.id}
              term={metric.term}
              label={t(`metric_${metric.id}`)}
              value={now.average === null ? '-' : now.average.toFixed(metric.decimals)}
              unit={t(`unit_${metric.id}`)}
              valueClassName={
                metric.id === 'ahi' && now.average !== null
                  ? `text-[var(--severity-${ahiSeverity(now.average)})]`
                  : undefined
              }
              valueLabel={t('averageLabel')}
              aside={
                <>
                  {metric.id === 'ahi' && now.average !== null ? (
                    <SeverityChip severity={ahiSeverity(now.average)} />
                  ) : null}
                  {change === null ? null : (
                    <ChangeBadge change={change} lowerIsBetter={metric.lowerIsBetter} label={comparisonLabel(change)} />
                  )}
                </>
              }
              detail={
                <div className="space-y-1.5">
                  <StatLine
                    items={[
                      {
                        label: t('percentile95'),
                        term: 'percentile95',
                        value: now.percentile95 === null ? '-' : now.percentile95.toFixed(metric.decimals),
                      },
                    ]}
                  />
                  {metric.id === 'ahi' ? (
                    <StatLine
                      items={BREAKDOWN.map((entry) => {
                        const average = summariseTrend(inWindow.map(entry.read)).average

                        return {
                          label: summaryLabels(entry.key),
                          term: entry.term,
                          value: average === null ? '-' : average.toFixed(1),
                        }
                      })}
                    />
                  ) : null}
                </div>
              }
            />
          )
        })}
      </div>

      <PanelCard>
        <PanelCardHeader
          title={t('trendsTitle')}
          description={
            zoomed
              ? t('zoomedRange', { from: dayLabel(window.from), to: dayLabel(window.to) })
              : t('trendsDescription', { nights: inWindow.length, days: daysBetween(window) })
          }
          action={
            <div className="flex shrink-0 items-center gap-2">
              {resetButton}
              {trendToggle}
              <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
                <Maximize2 aria-hidden />
                <span className="hidden sm:inline">{actions('fullscreen')}</span>
              </Button>
            </div>
          }
        />
        {trendRows('overview', CHART_HEIGHT)}
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground md:px-5">{t('pickHint')}</p>

        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent
            showCloseButton={false}
            className="top-0 left-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 ring-0 sm:max-w-none"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2.5 md:px-5">
              <DialogTitle className="text-sm font-semibold tracking-tight">{t('trendsTitle')}</DialogTitle>
              <div className="flex items-center gap-2">
                {resetButton}
                {trendToggle}
                <DialogClose render={<Button variant="outline" size="sm" />}>{actions('exitFullscreen')}</DialogClose>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {expanded ? trendRows('overviewFullscreen', FULLSCREEN_CHART_HEIGHT) : null}
            </div>
          </DialogContent>
        </Dialog>
      </PanelCard>
    </div>
  )
}
