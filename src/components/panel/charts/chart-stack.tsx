'use client'

import { useMemo, useState } from 'react'
import { Maximize2, RotateCcw } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import {
  LARGE_LEAK_THRESHOLD,
  ahiOverTime,
  allEvents,
  decimate,
  type ChannelId,
  type PapDay,
  type PapEvent,
} from '@/lib/pap'
import { AHI_SEVERITY_BANDS } from '@/lib/pap/severity'
import { channelExists } from '@/lib/pap/decimate'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { TermId } from '@/lib/terms'
import { PanelCard, PanelCardHeader } from '../panel-card'
import { TermHint } from '../term-hint'
import { ChartRows, type ChartRowSpec } from './chart-rows'
import { EVENT_COLORS } from './event-colors'
import { formatAxisValue, padDomain } from './axis'
import type { ChartSyncKey } from './signal-chart'

const TARGET_POINTS = 1600
const AHI_CHART_HEIGHT = 120
const AHI_AXIS_PAD = 1.1
const DOMAIN_POINTS = 600
const MIN_EVENT_MS = 1000

interface ChartConfig {
  id: ChannelId & TermId
  channels: { id: ChannelId; color: string }[]
  height: number
  symmetric?: boolean
  fromZero?: boolean
  band?: number
}

function single(id: ChannelId & TermId, color: string, height: number, extra: Partial<ChartConfig> = {}): ChartConfig {
  return { id, channels: [{ id, color }], height, ...extra }
}

const CHARTS: ChartConfig[] = [
  single('flow', '--signal-flow', 220, { symmetric: true }),
  {
    id: 'therapyPressure',
    channels: [
      { id: 'therapyPressure', color: '--signal-pressure' },
      { id: 'expiratoryPressure', color: '--signal-effort' },
    ],
    height: 140,
    fromZero: true,
  },
  single('maskPressure', '--signal-pressure', 140, { fromZero: true }),
  single('leak', '--signal-leak', 140, { fromZero: true, band: LARGE_LEAK_THRESHOLD }),
  single('respiratoryRate', '--signal-respiration', 120, { fromZero: true }),
  single('tidalVolume', '--signal-respiration', 120, { fromZero: true }),
  single('minuteVentilation', '--signal-respiration', 120, { fromZero: true }),
  single('snore', '--signal-effort', 110, { fromZero: true }),
  single('flowLimitation', '--signal-effort', 110, { fromZero: true }),
  single('oxygenSaturation', '--signal-respiration', 120),
  single('pulse', '--signal-effort', 120, { fromZero: true }),
]

export interface ChartStackProps {
  day: PapDay
  syncKey: ChartSyncKey
  fullscreenSyncKey: ChartSyncKey
  range: [number, number] | null
  onRangeChange: (range: [number, number] | null) => void
}

export function ChartStack({ day, syncKey, fullscreenSyncKey, range, onRangeChange }: ChartStackProps) {
  const t = useTranslations('Channels')
  const largeLeakLabel = t('largeLeakReference')
  const eventNames = useTranslations('Events')
  const actions = useTranslations('Actions')
  const format = useFormatter()
  const [expanded, setExpanded] = useState(false)

  const [fromMs, toMs] = range ?? [day.startMs, day.endMs]

  const available = useMemo(
    () => CHARTS.filter((chart) => chart.channels.some((channel) => channelExists(day.sessions, channel.id))),
    [day],
  )

  const domains = useMemo(() => {
    const map = new Map<ChannelId, [number, number]>()
    for (const chart of available) {
      const spans = chart.channels.map((channel) =>
        decimate(day.sessions, channel.id, day.startMs, day.endMs, DOMAIN_POINTS),
      )
      const min = Math.min(...spans.map((span) => span.min))
      const max = Math.max(...spans.map((span) => span.max))
      map.set(chart.id, padDomain(min, max, chart))
    }
    return map
  }, [available, day])

  const presentEventTypes = useMemo(
    () => [...new Set(allEvents(day.sessions).map((event: PapEvent) => event.type))],
    [day],
  )

  const rowSpecs = useMemo(() => {
    const built: ChartRowSpec[] = []

    for (const chart of available) {
      const domain = domains.get(chart.id)
      if (!domain) continue

      const drawn = chart.channels
        .map((channel) => ({ channel, data: decimate(day.sessions, channel.id, fromMs, toMs, TARGET_POINTS) }))
        .filter((entry) => entry.data.x.length > 0)
      if (drawn.length === 0) continue

      built.push({
        id: chart.id as string,
        label: (
          <>
            {t(chart.id)}
            <TermHint term={chart.id} />
            {drawn.length > 1
              ? drawn.map(({ channel }) => (
                  <span key={channel.id} className="flex items-center gap-1 font-normal text-muted-foreground">
                    <span
                      className="size-2 rounded-[2px]"
                      style={{ backgroundColor: `var(${channel.color})` }}
                      aria-hidden
                    />
                    {t(channel.id)}
                  </span>
                ))
              : null}
          </>
        ),
        unit: drawn[0].data.unit,
        height: chart.height,
        x: drawn[0].data.x,
        lines: drawn.map((entry) => ({ y: entry.data.y, color: entry.channel.color })),
        yRange: domain,
        bands:
          chart.band === undefined
            ? undefined
            : [{ value: chart.band, color: '--event-obstructive', label: largeLeakLabel }],
        formatValue: (value: number) => formatAxisValue(value, domain[1] - domain[0]),
      })
    }

    const trace = ahiOverTime(allEvents(day.sessions), day.startMs, day.endMs)
    if (trace.x.length > 0) {
      const ceiling = Math.max(...trace.y, AHI_SEVERITY_BANDS[AHI_SEVERITY_BANDS.length - 1].from) * AHI_AXIS_PAD

      built.push({
        id: 'ahiOverTime',
        label: (
          <>
            {t('ahiOverTime')}
            <TermHint term="ahi" />
          </>
        ),
        unit: t('ahiOverTimeUnit'),
        height: AHI_CHART_HEIGHT,
        x: trace.x,
        lines: [{ y: trace.y, color: '--signal-flow' }],
        yRange: [0, ceiling],
        bands: AHI_SEVERITY_BANDS.filter((band) => band.from > 0).map((band) => ({
          value: band.from,
          color: `--severity-${band.id}`,
          label: String(band.from),
        })),
        formatValue: (value: number) => value.toFixed(1),
      })
    }

    return built
  }, [available, day, domains, fromMs, toMs, largeLeakLabel, t])

  const visibleEvents = useMemo(
    () =>
      allEvents(day.sessions).filter(
        (event) => event.startMs + Math.max(event.durationMs, MIN_EVENT_MS) >= fromMs && event.startMs <= toMs,
      ),
    [day, fromMs, toMs],
  )

  const zoomed = range !== null
  const clock = (ms: number) => format.dateTime(new Date(ms), { hour: '2-digit', minute: '2-digit' })

  if (available.length === 0) {
    return (
      <PanelCard>
        <PanelCardHeader title={t('title')} />
        <p className="px-5 py-8 text-sm text-muted-foreground">{t('summaryOnly')}</p>
      </PanelCard>
    )
  }

  const cursorEventChip = (atMs: number) => {
    const event = visibleEvents.find(
      (candidate) =>
        atMs >= candidate.startMs && atMs <= candidate.startMs + Math.max(candidate.durationMs, MIN_EVENT_MS),
    )
    if (!event) return null

    return (
      <span
        className="shrink-0 rounded-[4px] px-1.5 text-[11px] leading-5 font-medium"
        style={{
          backgroundColor: `color-mix(in oklab, var(${EVENT_COLORS[event.type]}) 22%, transparent)`,
          color: `var(${EVENT_COLORS[event.type]})`,
        }}
      >
        {eventNames(event.type)}
      </span>
    )
  }

  const rows = (key: ChartSyncKey) => (
    <ChartRows
      rows={rowSpecs}
      syncKey={key}
      fromMs={fromMs}
      toMs={toMs}
      events={visibleEvents}
      eventColors={EVENT_COLORS}
      noReadingLabel={t('noReading')}
      formatCursorTime={clock}
      renderCursorDetail={cursorEventChip}
      onZoom={(start, end) => onRangeChange([start, end])}
      onReset={() => onRangeChange(null)}
    />
  )

  const legend =
    presentEventTypes.length > 0 ? (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-border px-4 py-2.5 md:px-5">
        {presentEventTypes.map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: `var(${EVENT_COLORS[type]})` }}
              aria-hidden
            />
            {eventNames(type)}
          </span>
        ))}
      </div>
    ) : null

  const resetButton = zoomed ? (
    <Button variant="outline" size="sm" onClick={() => onRangeChange(null)}>
      <RotateCcw aria-hidden />
      {actions('resetZoom')}
    </Button>
  ) : null

  return (
    <PanelCard>
      <PanelCardHeader
        title={t('title')}
        description={zoomed ? t('zoomedHint', { from: clock(fromMs), to: clock(toMs) }) : t('zoomHint')}
        action={
          <div className="flex shrink-0 items-center gap-2">
            {resetButton}
            <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
              <Maximize2 aria-hidden />
              <span className="hidden sm:inline">{actions('fullscreen')}</span>
            </Button>
          </div>
        }
      />
      {legend}
      {rows(syncKey)}
      <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground md:px-5">
        {t('envelopeNote', { threshold: LARGE_LEAK_THRESHOLD })}
      </p>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 ring-0 sm:max-w-none"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2.5 md:px-5">
            <DialogTitle className="text-sm font-semibold tracking-tight">{t('title')}</DialogTitle>
            <div className="flex items-center gap-2">
              {resetButton}
              <DialogClose render={<Button variant="outline" size="sm" />}>{actions('exitFullscreen')}</DialogClose>
            </div>
          </header>
          {legend}
          <div className="min-h-0 flex-1 overflow-y-auto">{expanded ? rows(fullscreenSyncKey) : null}</div>
        </DialogContent>
      </Dialog>
    </PanelCard>
  )
}
