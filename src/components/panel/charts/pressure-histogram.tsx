'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { timeAtPressure, type PapDay } from '@/lib/pap'
import { PanelCard } from '../panel-card'
import { TermHint } from '../term-hint'
import { ChartRows, type ChartRowSpec } from './chart-rows'

const CHART_HEIGHT = 160
const AXIS_PAD = 1.1
const BUCKET_CMH2O = 0.2

export function PressureHistogram({ day }: { day: PapDay }) {
  const t = useTranslations('Channels')

  const dwell = useMemo(() => timeAtPressure(day.sessions), [day])

  const rows = useMemo<ChartRowSpec[]>(() => {
    if (dwell.pressure.length === 0) return []

    return [
      {
        id: 'timeAtPressure',
        label: (
          <>
            {t('timeAtPressure')}
            <TermHint term="timeAtPressure" />
          </>
        ),
        unit: t('timeAtPressureUnit'),
        height: CHART_HEIGHT,
        x: dwell.pressure,
        lines: [{ y: dwell.minutes, color: '--signal-pressure' }],
        yRange: [0, Math.max(...dwell.minutes) * AXIS_PAD || 1],
        drawStyle: 'bars',
        xScale: 'linear',
        formatX: (value: number) => value.toFixed(1),
        formatValue: (value: number) => value.toFixed(1),
      },
    ]
  }, [dwell, t])

  if (rows.length === 0) return null

  const lowest = dwell.pressure[0] - BUCKET_CMH2O
  const highest = dwell.pressure[dwell.pressure.length - 1] + BUCKET_CMH2O

  return (
    <PanelCard>
      <ChartRows
        rows={rows}
        syncKey="pressureHistogram"
        fromMs={lowest}
        toMs={highest}
        noReadingLabel={t('noReading')}
        formatCursorTime={(value) => value.toFixed(1)}
        onZoom={() => undefined}
        onReset={() => undefined}
      />
      <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground md:px-5">
        {t('timeAtPressureDescription')}
      </p>
    </PanelCard>
  )
}
