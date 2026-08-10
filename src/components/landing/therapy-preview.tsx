import { useFormatter, useTranslations } from 'next-intl'
import { papDayDate } from '@/lib/pap'
import { PanelCard, PanelCardHeader } from '@/components/panel/panel-card'
import { EVENT_COLORS } from '@/components/panel/charts/event-colors'
import { cn } from '@/lib/utils'

const MINUTES_PER_HOUR = 60
const PRESETS = [7, 30, 90] as const
const CHART_WIDTH = 600
const CHART_HEIGHT = 88
const CHART_PADDING_Y = 12
const CHART_FROM_MS = 1_786_317_285_200
const CHART_TO_MS = 1_786_317_585_200
const EVENT_START_MS = 1_786_317_405_200
const EVENT_DURATION_MS = 34_000
const EVENT_X = ((EVENT_START_MS - CHART_FROM_MS) / (CHART_TO_MS - CHART_FROM_MS)) * CHART_WIDTH
const EVENT_WIDTH = (EVENT_DURATION_MS / (CHART_TO_MS - CHART_FROM_MS)) * CHART_WIDTH

const METRICS = [
  { id: 'ahi', average: 6, percentile95: 15.9 },
  { id: 'usage', average: 6.9, percentile95: 8.1 },
  { id: 'leak', average: 14.2, percentile95: 43.1 },
  { id: 'pressure', average: 9.1, percentile95: 11.6 },
] as const

const NIGHTS = [
  { date: '2026-08-09', usageMinutes: 480.2, ahi: 7.9 },
  { date: '2026-08-08', usageMinutes: 422.5, ahi: 8.5 },
  { date: '2026-08-07', usageMinutes: 396.8, ahi: 6.1 },
  { date: '2026-08-06', usageMinutes: 419.2, ahi: 8.3 },
] as const

const SIGNALS = [
  {
    id: 'flow',
    color: '--signal-flow',
    min: -25.56,
    max: 38.64,
    values: [
      -14.16, 20.64, 21.48, -14.16, 21.84, -14.4, -14.76, 22.92, -15.12, 22.68, -15, 22.68, -14.4, 19.92, -14.16, 21.96,
      -14.52, 22.2, 19.8, -14.64, 0, 0, 38.64, -25.56, 22.56, -14.88, 22.32, -14.76, 21.96, -14.52, 22.56, -14.88, 22.2,
      -14.64, 23.04, -15.24, 21.36, -14.16, 22.68, -15, 22.56, -14.88, 22.8, -15, -13.92, 21.48,
    ],
  },
  {
    id: 'maskPressure',
    color: '--signal-pressure',
    min: 4.39,
    max: 7.4,
    values: [
      4.94, 7.4, 4.93, 7.39, 4.93, 7.39, 4.93, 7.39, 4.93, 7.39, 7.39, 4.41, 4.41, 6.87, 6.87, 4.41, 6.87, 4.41, 6.87,
      4.41, 6.87, 4.4, 6.86, 4.4, 6.86, 4.4, 6.86, 4.4, 6.86, 4.4, 4.4, 6.86, 4.4, 6.86, 4.4, 6.86, 4.4, 6.86, 4.4,
      6.86, 6.86, 4.39, 4.39, 6.85, 4.39, 6.85, 4.39, 6.85,
    ],
  },
  {
    id: 'leak',
    color: '--signal-leak',
    min: 4.92,
    max: 5.7,
    values: [
      5.4, 5.4, 4.92, 4.92, 4.92, 4.92, 4.92, 5.7, 5.7, 5.7, 5.7, 5.7, 5.1, 5.1, 5.1, 5.1, 5.1, 4.98, 4.98, 4.98, 4.98,
      4.98, 5.04, 5.04, 5.04, 5.04,
    ],
  },
] as const

type Signal = (typeof SIGNALS)[number]

function signalPoints(signal: Signal): string {
  const usableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2

  return signal.values
    .map((value, index) => {
      const x = (index / (signal.values.length - 1)) * CHART_WIDTH
      const y = CHART_PADDING_Y + ((signal.max - value) / (signal.max - signal.min)) * usableHeight

      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function OverviewMetric({ metric }: { metric: (typeof METRICS)[number] }) {
  const t = useTranslations('Overview')
  const format = useFormatter()

  return (
    <PanelCard className="min-w-0 px-3 py-3 sm:px-4">
      <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{t(`metric_${metric.id}`)}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
          {format.number(metric.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
        <span className="truncate text-[9px] text-muted-foreground sm:text-[10px]">{t(`unit_${metric.id}`)}</span>
      </p>
      <p className="mt-1.5 text-[9px] text-muted-foreground sm:text-[10px]">
        {t('percentile95')}{' '}
        <span className="font-medium text-foreground tabular-nums">
          {format.number(metric.percentile95, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      </p>
    </PanelCard>
  )
}

export function TherapyPreview() {
  const landing = useTranslations('Landing')
  const overview = useTranslations('Overview')
  const format = useFormatter()

  return (
    <section
      aria-label={landing('previewLabel')}
      className="space-y-2 rounded-2xl border border-border bg-background p-2.5 shadow-2xl shadow-foreground/5"
    >
      <PanelCard className="flex items-center gap-1 overflow-x-auto px-2 py-2">
        {PRESETS.map((days) => (
          <span
            key={days}
            className={cn(
              'shrink-0 rounded-lg border border-input px-2 py-1 text-[10px] font-medium sm:text-xs',
              days === 30 && 'bg-muted text-foreground',
            )}
          >
            {overview('presetDays', { days })}
          </span>
        ))}
        <span className="shrink-0 rounded-lg border border-input px-2 py-1 text-[10px] font-medium sm:text-xs">
          {overview('presetAll')}
        </span>
      </PanelCard>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {METRICS.map((metric) => (
          <OverviewMetric key={metric.id} metric={metric} />
        ))}
      </div>

      <PanelCard>
        <PanelCardHeader title={landing('nightsTitle')} description={landing('nightsDescription')} />
        <ul className="divide-y divide-border/60">
          {NIGHTS.map((night) => (
            <li key={night.date} className="flex items-center justify-between gap-3 px-4 py-2 text-[10px] sm:text-xs">
              <span>
                {format.dateTime(papDayDate(night.date), { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <span className="flex items-center gap-4 tabular-nums">
                <span className="text-muted-foreground">
                  {format.number(night.usageMinutes / MINUTES_PER_HOUR, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </span>
                <span className="font-medium">
                  {format.number(night.ahi, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </PanelCard>
    </section>
  )
}

function SignalRow({ signal }: { signal: Signal }) {
  const channels = useTranslations('Channels')
  const summary = useTranslations('Summary')
  const overview = useTranslations('Overview')
  const unit = signal.id === 'maskPressure' ? overview('unit_pressure') : summary('leakUnit')

  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-stretch border-t border-border sm:grid-cols-[7.5rem_1fr]">
      <div className="flex flex-col justify-center px-3 py-3 sm:px-4">
        <p className="text-[10px] font-medium sm:text-xs">{channels(signal.id)}</p>
        <p className="mt-0.5 text-[9px] text-muted-foreground sm:text-[10px]">{unit}</p>
      </div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={channels(signal.id)}
        className="h-20 w-full border-l border-border sm:h-24"
      >
        {[1, 2, 3].map((line) => (
          <line
            key={line}
            x1="0"
            x2={CHART_WIDTH}
            y1={(line * CHART_HEIGHT) / 4}
            y2={(line * CHART_HEIGHT) / 4}
            stroke="var(--border)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <rect
          x={EVENT_X}
          y="0"
          width={EVENT_WIDTH}
          height={CHART_HEIGHT}
          fill={`var(${EVENT_COLORS.obstructiveApnea})`}
          fillOpacity="0.18"
        />
        <polyline
          points={signalPoints(signal)}
          fill="none"
          stroke={`var(${signal.color})`}
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

export function StaticSignalPreview() {
  const landing = useTranslations('Landing')
  const channels = useTranslations('Channels')
  const events = useTranslations('Events')
  const format = useFormatter()
  const clock = (ms: number) => format.dateTime(new Date(ms), { hour: '2-digit', minute: '2-digit' })

  return (
    <div role="group" aria-label={landing('signalPreviewLabel')}>
      <PanelCard className="overflow-hidden">
        <PanelCardHeader title={channels('title')} description={landing('signalPreviewDescription')} />
        <div className="flex items-center justify-between gap-4 border-b border-border px-3 py-2 sm:px-4">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
            <span
              className="size-2 rounded-[2px]"
              style={{ backgroundColor: `var(${EVENT_COLORS.obstructiveApnea})` }}
              aria-hidden
            />
            {events('obstructiveApnea')}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums sm:text-xs">
            {clock(CHART_FROM_MS)} · {clock(CHART_TO_MS)}
          </span>
        </div>
        {SIGNALS.map((signal) => (
          <SignalRow key={signal.id} signal={signal} />
        ))}
      </PanelCard>
    </div>
  )
}
