'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { allEvents, eventIndices, papDayDate, sessionDurationMs, truncateToTenth } from '@/lib/pap'
import type { PapDay, PapEvent, PapImport } from '@/lib/pap'
import { ahiSeverity } from '@/lib/pap/severity'
import { apiErrorKey, type ApiErrorMessageKey } from '@/lib/api'
import { fetchDayCard, fetchDayIndex, TherapyApiError, type DayIndexEntry } from '@/lib/therapy/client'
import { ChartStack } from './charts/chart-stack'
import { PressureHistogram } from './charts/pressure-histogram'
import { DayStrip } from './day-strip'
import { DeviceCard } from './device-card'
import { EventList } from './event-list'
import { PanelCard, PanelSection } from './panel-card'
import { SessionTable } from './session-table'
import { CurrentSettingsCard, DaySettingsCard } from './settings-panel'
import { EnvironmentCard, StatisticsCard } from './statistics-panel'
import { SummaryTiles } from './summary-tiles'

const EVENT_FOCUS_WINDOW_MS = 120_000

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'failed'; key: ApiErrorMessageKey }

function focusRange(event: PapEvent): [number, number] {
  const middle = event.startMs + event.durationMs / 2

  return [middle - EVENT_FOCUS_WINDOW_MS / 2, middle + EVENT_FOCUS_WINDOW_MS / 2]
}

export function TherapyScreen({ initialDate }: { initialDate: string | null }) {
  const t = useTranslations('Therapy')
  const sections = useTranslations('TherapySections')
  const format = useFormatter()

  const [index, setIndex] = useState<DayIndexEntry[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [card, setCard] = useState<PapImport | null>(null)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [range, setRange] = useState<[number, number] | null>(null)
  const [focused, setFocused] = useState<PapEvent | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const days = await fetchDayIndex()
        if (cancelled) return
        setIndex(days)
        setSelected(days.some((day) => day.date === initialDate) ? initialDate : (days.at(-1)?.date ?? null))
        if (days.length === 0) setState({ status: 'ready' })
      } catch (error) {
        if (!cancelled)
          setState({ status: 'failed', key: apiErrorKey(error instanceof TherapyApiError ? error.code : undefined) })
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [initialDate])

  useEffect(() => {
    if (!selected) return
    let cancelled = false

    const load = async () => {
      setState({ status: 'loading' })
      setRange(null)
      setFocused(null)
      try {
        const parsed = await fetchDayCard(selected)
        if (cancelled) return
        setCard(parsed)
        setState({ status: 'ready' })
      } catch (error) {
        if (!cancelled)
          setState({ status: 'failed', key: apiErrorKey(error instanceof TherapyApiError ? error.code : undefined) })
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [selected])

  const day: PapDay | null = useMemo(
    () => card?.days.find((candidate) => candidate.date === selected) ?? null,
    [card, selected],
  )

  const available = useMemo(() => new Set(index.map((entry) => entry.date)), [index])

  const formatDayLabel = useCallback(
    (date: string) =>
      format.dateTime(papDayDate(date), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    [format],
  )

  const selectEvent = (event: PapEvent) => {
    setFocused(event)
    setRange(focusRange(event))
  }

  const severity = useMemo(() => {
    if (!day) return null
    const usageMs = day.summary ? day.summary.usageMinutes * 60_000 : sessionDurationMs(day.sessions)
    const ahi = day.summary ? day.summary.ahi : truncateToTenth(eventIndices(allEvents(day.sessions), usageMs).ahi)

    return ahiSeverity(ahi)
  }, [day])

  return (
    <>
      <header className="sticky top-0 z-10 space-y-2 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur md:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-sm font-semibold tracking-tight">{selected ? formatDayLabel(selected) : t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('dayNote')}</p>
        </div>
        {selected ? <DayStrip available={available} selected={selected} onSelect={setSelected} /> : null}
      </header>

      <div className="flex-1 space-y-3 p-4 md:p-5">
        {state.status === 'loading' ? (
          <PanelCard className="flex items-center gap-3 px-5 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('reading')}
          </PanelCard>
        ) : null}

        {state.status === 'failed' ? (
          <PanelCard className="mx-auto flex max-w-lg items-start gap-3 px-5 py-4 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">{t('errorTitle')}</p>
              <p className="mt-0.5 text-muted-foreground">{t('errorUnknown')}</p>
            </div>
          </PanelCard>
        ) : null}

        {state.status === 'ready' && day && card ? (
          <>
            <SummaryTiles day={day} severity={severity} />

            <div className="grid items-start gap-3 lg:grid-cols-4">
              <div className="space-y-3 lg:col-span-1">
                <StatisticsCard summary={day.summary} />
                <EnvironmentCard summary={day.summary} />
                <DaySettingsCard settings={day.settings} />
                <EventList day={day} focused={focused} onSelect={selectEvent} />
              </div>
              <div className="min-w-0 space-y-3 lg:col-span-3">
                <ChartStack
                  day={day}
                  syncKey="therapy"
                  fullscreenSyncKey="therapyFullscreen"
                  range={range}
                  onRangeChange={(next) => {
                    setRange(next)
                    if (next === null) setFocused(null)
                  }}
                />
                <PressureHistogram day={day} />
              </div>
            </div>

            <PanelSection title={sections('nightTitle')} description={sections('nightDescription')}>
              <SessionTable day={day} />
            </PanelSection>

            <PanelSection title={sections('deviceTitle')} description={sections('deviceDescription')}>
              <div className="grid items-start gap-3 lg:grid-cols-2">
                <DeviceCard device={card.device} />
                <CurrentSettingsCard groups={card.settingGroups} />
              </div>
            </PanelSection>
          </>
        ) : null}

        {state.status === 'ready' && !day ? (
          <PanelCard className="px-5 py-8 text-sm text-muted-foreground">{t('noDays')}</PanelCard>
        ) : null}
      </div>
    </>
  )
}
