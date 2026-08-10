'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { papDayDate } from '@/lib/pap'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NARROW_VIEWPORT_PX = 768
const NARROW_WINDOW_DAYS = 4

interface Month {
  year: number
  month: number
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function monthOf(date: string): Month {
  const [year, month] = date.split('-').map(Number)

  return { year, month }
}

function shiftMonth({ year, month }: Month, by: number): Month {
  const index = year * 12 + (month - 1) + by

  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

function daysInMonth({ year, month }: Month): string[] {
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return Array.from({ length: total }, (_, index) => `${year}-${pad(month)}-${pad(index + 1)}`)
}

export function windowAround(days: string[], selected: string, radius: number): string[] {
  if (days.length <= radius * 2 + 1) return days
  const middle = days.indexOf(selected)
  if (middle < 0) return days.slice(0, radius * 2 + 1)

  const start = Math.min(Math.max(0, middle - radius), days.length - (radius * 2 + 1))

  return days.slice(start, start + radius * 2 + 1)
}

function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${NARROW_VIEWPORT_PX - 1}px)`)
    const sync = () => setNarrow(query.matches)
    sync()
    query.addEventListener('change', sync)

    return () => query.removeEventListener('change', sync)
  }, [])

  return narrow
}

export function DayStrip({
  available,
  selected,
  onSelect,
}: {
  available: Set<string>
  selected: string
  onSelect: (date: string) => void
}) {
  const t = useTranslations('DayStrip')
  const format = useFormatter()
  const narrow = useNarrowViewport()
  const [cursor, setCursor] = useState(() => monthOf(selected))
  const [shown, setShown] = useState(selected)

  if (selected !== shown) {
    const next = monthOf(selected)
    setShown(selected)
    if (next.year !== cursor.year || next.month !== cursor.month) setCursor(next)
  }

  const month = useMemo(() => daysInMonth(cursor), [cursor])
  const days = narrow ? windowAround(month, selected, NARROW_WINDOW_DAYS) : month
  const monthLabel = format.dateTime(papDayDate(`${cursor.year}-${pad(cursor.month)}-01`), {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      <p className="pb-1 text-center text-xs font-medium tracking-tight">{monthLabel}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label={t('previousMonth')}
          onClick={() => setCursor(shiftMonth(cursor, -1))}
        >
          <ChevronLeft aria-hidden />
        </Button>

        <div
          className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto px-0.5 py-0.5"
          role="group"
          aria-label={t('selectDay')}
        >
          {days.map((date) => {
            const hasData = available.has(date)
            const active = date === selected

            return (
              <button
                key={date}
                type="button"
                aria-pressed={active}
                aria-label={format.dateTime(papDayDate(date), { day: 'numeric', month: 'long', year: 'numeric' })}
                disabled={!hasData}
                onClick={() => onSelect(date)}
                className={cn(
                  'h-7 min-w-7 flex-1 rounded-[4px] text-[11px] tabular-nums transition-colors',
                  active && 'outline-2 outline-offset-1 outline-ring',
                  hasData
                    ? 'bg-[var(--severity-normal)]/25 font-medium text-foreground hover:bg-[var(--severity-normal)]/45'
                    : 'bg-muted text-muted-foreground/50',
                )}
              >
                {Number(date.slice(-2))}
              </button>
            )
          })}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label={t('nextMonth')}
          onClick={() => setCursor(shiftMonth(cursor, 1))}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}
