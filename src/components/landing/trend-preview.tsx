import { ArrowUpRight } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { PanelCard, PanelCardHeader } from '@/components/panel/panel-card'
import { cn } from '@/lib/utils'

const RECENT_NIGHTS = 7
const CHART_MAX_AHI = 20
const MINIMUM_BAR_HEIGHT_PERCENT = 4

const AHI_VALUES = [
  4.5, 11.6, 3.6, 1.8, 2.8, 10.9, 3.1, 3.1, 2.9, 0.9, 14.1, 0.7, 2.3, 3.5, 1.4, 15.9, 3.5, 4.6, 4, 3.8, 4.7, 16.4, 6.9,
  6.5, 9.7, 6.6, 8.3, 6.1, 8.5, 7.9,
] as const

const COMPARISONS = [
  { id: 'ahi', current: 7.7, previous: 6.3, change: 22 },
  { id: 'usage', current: 7.3, previous: 5.6, change: 32 },
  { id: 'leak', current: 20.6, previous: 12.3, change: 67 },
  { id: 'pressure', current: 9.7, previous: 9.2, change: 5 },
] as const

export function TrendPreview() {
  const landing = useTranslations('Landing')
  const overview = useTranslations('Overview')
  const format = useFormatter()
  const recentFrom = AHI_VALUES.length - RECENT_NIGHTS

  return (
    <PanelCard className="overflow-hidden">
      <PanelCardHeader title={landing('trendPreviewTitle')} description={landing('trendPreviewDescription')} />
      <div className="px-4 pt-4 sm:px-5">
        <div className="flex items-center justify-end gap-4 text-[10px] text-muted-foreground sm:text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-muted-foreground/35" aria-hidden />
            {landing('trendEarlier')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-signal-flow" aria-hidden />
            {landing('trendRecent')}
          </span>
        </div>
        <div
          role="img"
          aria-label={landing('trendChartLabel')}
          className="relative mt-3 flex h-36 items-end gap-1 border-b border-border sm:h-44 sm:gap-1.5"
        >
          <span className="absolute inset-x-0 top-1/4 border-t border-border/70" aria-hidden />
          <span className="absolute inset-x-0 top-1/2 border-t border-border/70" aria-hidden />
          <span className="absolute inset-x-0 top-3/4 border-t border-border/70" aria-hidden />
          {AHI_VALUES.map((value, index) => (
            <span
              key={index}
              className={cn(
                'relative z-10 min-w-0 flex-1 rounded-t-[2px] bg-muted-foreground/35',
                index >= recentFrom && 'bg-signal-flow',
              )}
              style={{ height: `${Math.max((value / CHART_MAX_AHI) * 100, MINIMUM_BAR_HEIGHT_PERCENT)}%` }}
              aria-hidden
            />
          ))}
        </div>
        <div className="flex justify-between py-2 text-[9px] text-muted-foreground sm:text-[10px]">
          <span>{landing('trendStart')}</span>
          <span>{landing('trendEnd')}</span>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[9px] text-muted-foreground sm:px-5 sm:text-[10px]">
          <span>{landing('trendComparisonTitle')}</span>
          <span>{landing('trendPrevious')}</span>
          <span>{landing('trendCurrent')}</span>
        </div>
        <ul className="divide-y divide-border/60 border-t border-border/60">
          {COMPARISONS.map((comparison) => (
            <li
              key={comparison.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5 text-[10px] sm:px-5 sm:text-xs"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{overview(`metric_${comparison.id}`)}</span>
                <span className="block truncate text-[9px] text-muted-foreground sm:text-[10px]">
                  {overview(`unit_${comparison.id}`)}
                </span>
                <span className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground sm:text-[10px]">
                  <ArrowUpRight className="size-3" aria-hidden />
                  {landing('trendHigher', { value: comparison.change })}
                </span>
              </span>
              <span className="text-muted-foreground tabular-nums">
                {format.number(comparison.previous, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <span className="min-w-10 text-right font-medium tabular-nums">
                {format.number(comparison.current, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </PanelCard>
  )
}
