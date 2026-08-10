'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { useLocale } from 'next-intl'
import { useTheme } from 'next-themes'
import UPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import type { PapEvent } from '@/lib/pap'
import { DEVICE_TIME_ZONE } from '@/lib/pap/device-time'
import { cn } from '@/lib/utils'
import { formatAxisValue, verticalAxisSplits } from './axis'

export const CHART_SYNC_KEYS = [
  'therapy',
  'therapyFullscreen',
  'overview',
  'overviewFullscreen',
  'pressureHistogram',
] as const

export type ChartSyncKey = (typeof CHART_SYNC_KEYS)[number]

export interface ChartBand {
  value: number
  color: string
  label?: string
  align?: 'start' | 'end'
}

export interface ChartLine {
  y: (number | null)[]
  color: string
  style?: 'line' | 'bars'
  dash?: number[]
}

export interface ChartReading {
  ms: number
  values: (number | null)[]
}

export interface SignalChartProps {
  chartId: string
  syncKey: ChartSyncKey
  dragOrigin: RefObject<string | null>
  x: number[]
  lines: ChartLine[]
  fromMs: number
  toMs: number
  height: number
  yRange: [number, number]
  events: PapEvent[]
  eventColors: Record<string, string>
  bands?: ChartBand[]
  drawStyle?: 'line' | 'bars'
  xScale?: 'time' | 'linear'
  formatX?: (value: number) => string
  onZoom: (fromMs: number, toMs: number) => void
  onReset: () => void
  onCursor?: (reading: ChartReading | null) => void
  onPick?: (atMs: number) => void
  className?: string
}

const HORIZONTAL_INTENT_PX = 12
const AXIS_FONT_SIZE_PX = 11
const AXIS_FONT_FAMILY = 'ui-sans-serif, system-ui, sans-serif'
const AXIS_FONT = `${AXIS_FONT_SIZE_PX}px ${AXIS_FONT_FAMILY}`
const Y_AXIS_WIDTH = 52
const EVENT_FILL_ALPHA = 0.28
const MIN_EVENT_WIDTH_PX = 2
const NARROW_VIEWPORT_PX = 640
const NARROW_HEIGHT_FACTOR = 0.78
const CLICK_SLOP_PX = 4
const MULTI_DAY_SPAN_MS = 3 * 86_400_000
const SECONDS_SPAN_MS = 10 * 60_000

function timeAxisFormat(spanMs: number): Intl.DateTimeFormatOptions {
  if (spanMs > MULTI_DAY_SPAN_MS) return { day: 'numeric', month: 'short', timeZone: DEVICE_TIME_ZONE }
  if (spanMs > SECONDS_SPAN_MS) return { hour: '2-digit', minute: '2-digit', timeZone: DEVICE_TIME_ZONE }

  return { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: DEVICE_TIME_ZONE }
}

function readVariable(element: HTMLElement, name: string): string {
  return getComputedStyle(element).getPropertyValue(name).trim() || '#888'
}

function scaledHeight(height: number, width: number): number {
  return Math.round(width < NARROW_VIEWPORT_PX ? height * NARROW_HEIGHT_FACTOR : height)
}

export function SignalChart({
  chartId,
  syncKey,
  dragOrigin,
  x,
  lines,
  fromMs,
  toMs,
  height,
  yRange,
  events,
  eventColors,
  bands,
  drawStyle = 'line',
  xScale = 'time',
  formatX,
  onZoom,
  onReset,
  onCursor,
  onPick,
  className,
}: SignalChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<UPlot | null>(null)
  const { resolvedTheme } = useTheme()
  const locale = useLocale()
  const latest = useRef({
    chartId,
    dragOrigin,
    x,
    lines,
    events,
    eventColors,
    bands,
    yRange,
    fromMs,
    toMs,
    onZoom,
    onReset,
    onCursor,
    onPick,
    formatX,
  })

  useEffect(() => {
    latest.current = {
      chartId,
      dragOrigin,
      x,
      lines,
      events,
      eventColors,
      bands,
      yRange,
      fromMs,
      toMs,
      onZoom,
      onReset,
      onCursor,
      onPick,
      formatX,
    }
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const gridColor = readVariable(container, '--border')
    const textColor = readVariable(container, '--muted-foreground')
    const hovered = { current: false }

    const chart = new UPlot(
      {
        width: container.clientWidth,
        height: scaledHeight(height, container.clientWidth),
        ms: 1,
        tzDate: (ms) => UPlot.tzDate(new Date(ms), DEVICE_TIME_ZONE),
        padding: [10, 8, 0, 0],
        legend: { show: false },
        cursor: {
          y: false,
          drag: { x: true, y: false, setScale: false },
          points: { show: false },
          sync: { key: syncKey, setSeries: false, scales: ['x', null] },
          bind: { dblclick: () => null },
        },
        scales: {
          x: { time: xScale === 'time', range: () => [latest.current.fromMs, latest.current.toMs] },
          y: { range: () => latest.current.yRange },
        },
        axes: [
          {
            stroke: textColor,
            grid: { stroke: gridColor, width: 1 },
            ticks: { stroke: gridColor, width: 1 },
            font: AXIS_FONT,
            values: (_self, splits) => {
              const { fromMs, toMs, formatX } = latest.current
              if (formatX) return splits.map(formatX)
              const formatter = new Intl.DateTimeFormat(locale, timeAxisFormat(toMs - fromMs))
              return splits.map((ms) => formatter.format(ms))
            },
          },
          {
            stroke: textColor,
            size: Y_AXIS_WIDTH,
            grid: { stroke: gridColor, width: 1 },
            ticks: { stroke: gridColor, width: 1 },
            font: AXIS_FONT,
            splits: () => verticalAxisSplits(latest.current.yRange),
            values: (_self, splits) => {
              const [min, max] = latest.current.yRange
              return splits.map((value) => formatAxisValue(value, max - min))
            },
          },
        ],
        series: [
          {},
          ...latest.current.lines.map((line) => {
            const stroke = readVariable(container, line.color)
            const bars = (line.style ?? drawStyle) === 'bars'

            return {
              stroke,
              fill: bars ? stroke : undefined,
              width: 1,
              dash: line.dash,
              points: { show: false },
              spanGaps: false,
              paths: bars ? UPlot.paths.bars?.({ size: [0.6, 20], align: 0 }) : undefined,
            }
          }),
        ],
        hooks: {
          setSelect: [
            (self) => {
              if (self.select.width <= 0) return
              const start = self.posToVal(self.select.left, 'x')
              const end = self.posToVal(self.select.left + self.select.width, 'x')
              self.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false)
              if (latest.current.dragOrigin.current !== latest.current.chartId) return
              latest.current.onZoom(start, end)
            },
          ],
          setCursor: [
            (self) => {
              const report = latest.current.onCursor
              if (!report || !hovered.current) return
              const left = self.cursor.left ?? -10
              if (left < 0) {
                report(null)
                return
              }
              const idx = self.cursor.idx
              const values = latest.current.lines.map((_line, index) =>
                idx == null ? null : ((self.data[index + 1] as (number | null)[])[idx] ?? null),
              )
              report({ ms: self.posToVal(left, 'x'), values })
            },
          ],
          draw: [
            (self) => {
              const { events: eventList, eventColors: colors, bands: bandLines } = latest.current
              const context = self.ctx
              const top = self.bbox.top
              const right = self.bbox.left + self.bbox.width

              for (const band of bandLines ?? []) {
                const yPosition = self.valToPos(band.value, 'y', true)
                if (!Number.isFinite(yPosition)) continue
                const bandColor = readVariable(container, band.color)
                context.save()
                context.strokeStyle = bandColor
                context.setLineDash([4, 4])
                context.lineWidth = 1
                context.beginPath()
                context.moveTo(self.bbox.left, yPosition)
                context.lineTo(right, yPosition)
                context.stroke()
                if (band.label) {
                  const atStart = band.align === 'start'
                  context.setLineDash([])
                  context.fillStyle = bandColor
                  context.font = `${AXIS_FONT_SIZE_PX * devicePixelRatio}px ${AXIS_FONT_FAMILY}`
                  context.textAlign = atStart ? 'left' : 'right'
                  context.textBaseline = 'bottom'
                  context.fillText(band.label, atStart ? self.bbox.left + 4 : right - 4, yPosition - 2)
                }
                context.restore()
              }

              if (eventList.length === 0) return
              const resolved = new Map<string, string>()
              context.save()
              context.globalAlpha = EVENT_FILL_ALPHA
              for (const event of eventList) {
                const left = self.valToPos(event.startMs, 'x', true)
                const end = self.valToPos(event.startMs + Math.max(event.durationMs, 1000), 'x', true)
                if (end < self.bbox.left || left > right) continue
                const variable = colors[event.type] ?? '--event-rera'
                let fill = resolved.get(variable)
                if (!fill) {
                  fill = readVariable(container, variable)
                  resolved.set(variable, fill)
                }
                context.fillStyle = fill
                context.fillRect(left, top, Math.max(end - left, MIN_EVENT_WIDTH_PX), self.bbox.height)
              }
              context.restore()
            },
          ],
        },
      },
      [latest.current.x, ...latest.current.lines.map((line) => line.y)] as unknown as UPlot.AlignedData,
      container,
    )

    chartRef.current = chart

    let pressedAt: number | null = null
    const claimDrag = (event?: MouseEvent) => {
      pressedAt = event ? event.clientX : null
      latest.current.dragOrigin.current = latest.current.chartId
    }

    const handleClick = (event: MouseEvent) => {
      const pick = latest.current.onPick
      if (!pick) return
      if (pressedAt !== null && Math.abs(event.clientX - pressedAt) > CLICK_SLOP_PX) return
      pick(chart.posToVal(event.clientX - chart.over.getBoundingClientRect().left, 'x'))
    }
    const handleEnter = () => {
      hovered.current = true
    }
    const handleLeave = () => {
      hovered.current = false
      latest.current.onCursor?.(null)
    }

    const handleDoubleClick = () => latest.current.onReset()
    container.addEventListener('dblclick', handleDoubleClick)
    chart.over.addEventListener('mousedown', claimDrag)
    chart.over.addEventListener('click', handleClick)
    chart.over.addEventListener('mouseenter', handleEnter)
    chart.over.addEventListener('mouseleave', handleLeave)

    let touchStartX: number | null = null
    let touchStartY: number | null = null
    let horizontal = false

    const localX = (clientX: number) => clientX - chart.over.getBoundingClientRect().left

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return
      claimDrag()
      touchStartX = event.touches[0].clientX
      touchStartY = event.touches[0].clientY
      horizontal = false
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (touchStartX === null || touchStartY === null || event.touches.length !== 1) return
      const deltaX = event.touches[0].clientX - touchStartX
      const deltaY = event.touches[0].clientY - touchStartY

      if (!horizontal) {
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          touchStartX = null
          return
        }
        if (Math.abs(deltaX) < HORIZONTAL_INTENT_PX) return
        horizontal = true
      }

      event.preventDefault()
      const left = Math.min(localX(touchStartX), localX(event.touches[0].clientX))
      chart.setSelect({ left, top: 0, width: Math.abs(deltaX), height: chart.bbox.height / devicePixelRatio }, false)
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (touchStartX === null || !horizontal) {
        touchStartX = null
        return
      }
      const endX = event.changedTouches[0].clientX
      const from = chart.posToVal(Math.min(localX(touchStartX), localX(endX)), 'x')
      const to = chart.posToVal(Math.max(localX(touchStartX), localX(endX)), 'x')
      chart.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false)
      touchStartX = null
      horizontal = false
      if (to > from) latest.current.onZoom(from, to)
    }

    chart.over.addEventListener('touchstart', handleTouchStart, { passive: true })
    chart.over.addEventListener('touchmove', handleTouchMove, { passive: false })
    chart.over.addEventListener('touchend', handleTouchEnd, { passive: true })

    const observer = new ResizeObserver(() => {
      const width = container.clientWidth
      chart.setSize({ width, height: scaledHeight(height, width) })
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      container.removeEventListener('dblclick', handleDoubleClick)
      chart.over.removeEventListener('mousedown', claimDrag)
      chart.over.removeEventListener('click', handleClick)
      chart.over.removeEventListener('mouseenter', handleEnter)
      chart.over.removeEventListener('mouseleave', handleLeave)
      chart.over.removeEventListener('touchstart', handleTouchStart)
      chart.over.removeEventListener('touchmove', handleTouchMove)
      chart.over.removeEventListener('touchend', handleTouchEnd)
      chart.destroy()
      chartRef.current = null
    }
  }, [height, resolvedTheme, syncKey, drawStyle, xScale, locale, lines.length])

  useEffect(() => {
    chartRef.current?.setData([x, ...lines.map((line) => line.y)] as unknown as UPlot.AlignedData, false)
  }, [x, lines])

  useEffect(() => {
    chartRef.current?.setScale('x', { min: fromMs, max: toMs })
  }, [fromMs, toMs])

  return <div ref={containerRef} className={cn('w-full', className)} />
}
