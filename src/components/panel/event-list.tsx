'use client'

import { useMemo } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { allEvents, type PapDay, type PapEvent, type PapEventType } from '@/lib/pap'
import { cn } from '@/lib/utils'
import { EVENT_COLORS } from './charts/event-colors'
import { PanelCard, PanelCardHeader } from './panel-card'

export function EventList({
  day,
  focused,
  onSelect,
}: {
  day: PapDay
  focused: PapEvent | null
  onSelect: (event: PapEvent) => void
}) {
  const t = useTranslations('Events')
  const labels = useTranslations('EventList')
  const format = useFormatter()

  const events = useMemo(() => allEvents(day.sessions), [day])

  const counts = useMemo(() => {
    const tally = new Map<PapEventType, number>()
    for (const event of events) tally.set(event.type, (tally.get(event.type) ?? 0) + 1)
    return [...tally.entries()]
  }, [events])

  return (
    <PanelCard>
      <PanelCardHeader title={labels('title')} description={labels('description')} />

      {counts.length > 0 ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 text-xs">
          {counts.map(([type, count]) => (
            <li key={type} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: `var(${EVENT_COLORS[type]})` }}
                aria-hidden
              />
              <span className="text-muted-foreground">{t(type)}</span>
              <span className="font-medium tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {events.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">{labels('empty')}</p>
      ) : (
        <ul className="max-h-96 divide-y divide-border/60 overflow-y-auto">
          {events.map((event) => {
            const active = focused?.startMs === event.startMs && focused.type === event.type

            return (
              <li key={`${event.type}-${event.startMs}`}>
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  aria-pressed={active}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs transition-colors',
                    active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: `var(${EVENT_COLORS[event.type]})` }}
                    aria-hidden
                  />
                  <span className="tabular-nums">
                    {format.dateTime(new Date(event.startMs), {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t(event.type)}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {labels('seconds', { count: Math.round(event.durationMs / 1000) })}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </PanelCard>
  )
}
