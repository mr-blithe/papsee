'use client'

import { useRef, useState, type ReactNode } from 'react'
import type { PapEvent } from '@/lib/pap'
import { ChartFrame } from './chart-frame'
import { SignalChart, type ChartBand, type ChartLine, type ChartSyncKey } from './signal-chart'

export interface ChartRowSpec {
  id: string
  label: ReactNode
  unit: string
  height: number
  x: number[]
  lines: ChartLine[]
  trend?: ChartLine
  yRange: [number, number]
  bands?: ChartBand[]
  drawStyle?: 'line' | 'bars'
  xScale?: 'time' | 'linear'
  formatX?: (value: number) => string
  formatValue: (value: number) => string
}

interface Cursor {
  rowId: string
  ms: number
  values: (number | null)[]
}

export interface ChartRowsProps {
  rows: ChartRowSpec[]
  syncKey: ChartSyncKey
  fromMs: number
  toMs: number
  events?: PapEvent[]
  eventColors?: Record<string, string>
  noReadingLabel: string
  formatCursorTime: (ms: number) => string
  renderCursorDetail?: (atMs: number) => ReactNode
  onZoom: (fromMs: number, toMs: number) => void
  onReset: () => void
  onPick?: (atMs: number) => void
}

export function ChartRows({
  rows,
  syncKey,
  fromMs,
  toMs,
  events,
  eventColors,
  noReadingLabel,
  formatCursorTime,
  renderCursorDetail,
  onZoom,
  onReset,
  onPick,
}: ChartRowsProps) {
  const dragOrigin = useRef<string | null>(null)
  const [cursor, setCursor] = useState<Cursor | null>(null)

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => {
        const reading =
          cursor?.rowId === row.id ? (
            <>
              <span>{row.formatX ? row.formatX(cursor.ms) : formatCursorTime(cursor.ms)}</span>
              <span className="font-medium text-foreground">
                {cursor.values.every((value) => value === null)
                  ? noReadingLabel
                  : cursor.values.map((value) => (value === null ? '-' : row.formatValue(value))).join(' / ')}
              </span>
              {renderCursorDetail?.(cursor.ms)}
            </>
          ) : null

        return (
          <ChartFrame key={row.id} label={row.label} unit={row.unit} readout={reading}>
            <SignalChart
              chartId={row.id}
              syncKey={syncKey}
              dragOrigin={dragOrigin}
              x={row.x}
              lines={row.trend ? [...row.lines, row.trend] : row.lines}
              fromMs={fromMs}
              toMs={toMs}
              height={row.height}
              yRange={row.yRange}
              events={events ?? []}
              eventColors={eventColors ?? {}}
              bands={row.bands}
              drawStyle={row.drawStyle}
              xScale={row.xScale}
              formatX={row.formatX}
              onZoom={onZoom}
              onReset={onReset}
              onPick={onPick}
              onCursor={(next) =>
                setCursor((current) =>
                  next
                    ? { rowId: row.id, ms: next.ms, values: next.values.slice(0, row.lines.length) }
                    : current?.rowId === row.id
                      ? null
                      : current,
                )
              }
            />
          </ChartFrame>
        )
      })}
    </div>
  )
}
