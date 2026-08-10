'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { countEvents, eventIndices, formatDuration, type PapDay } from '@/lib/pap'
import { PanelCard, PanelCardHeader } from './panel-card'

const SUB_MINUTE = 60_000

export function SessionTable({ day }: { day: PapDay }) {
  const t = useTranslations('Sessions')
  const format = useFormatter()

  if (day.sessions.length === 0) return null

  const clock = (ms: number) => format.dateTime(new Date(ms), { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <PanelCard>
      <PanelCardHeader title={t('title')} description={t('description')} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-5 py-2 font-medium">{t('start')}</th>
              <th className="px-5 py-2 font-medium">{t('end')}</th>
              <th className="px-5 py-2 text-right font-medium">{t('duration')}</th>
              <th className="px-5 py-2 text-right font-medium">{t('ahi')}</th>
              <th className="px-5 py-2 text-right font-medium">{t('obstructive')}</th>
              <th className="px-5 py-2 text-right font-medium">{t('central')}</th>
              <th className="px-5 py-2 text-right font-medium">{t('hypopnea')}</th>
              <th className="px-5 py-2 text-right font-medium">{t('rera')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {day.sessions.map((session) => {
              const durationMs = session.endMs - session.startMs
              const counts = countEvents(session.events)
              const indices = eventIndices(session.events, durationMs)
              const shortSession = durationMs < SUB_MINUTE

              return (
                <tr key={session.id} className="tabular-nums">
                  <td className="px-5 py-2">{clock(session.startMs)}</td>
                  <td className="px-5 py-2 text-muted-foreground">
                    {shortSession ? t('notAvailable') : clock(session.endMs)}
                  </td>
                  <td className="px-5 py-2 text-right">
                    {shortSession ? t('underMinute') : formatDuration(durationMs)}
                  </td>
                  <td className="px-5 py-2 text-right font-medium">
                    {shortSession ? t('notAvailable') : indices.ahi.toFixed(1)}
                  </td>
                  <td className="px-5 py-2 text-right text-muted-foreground">{counts.obstructiveApnea}</td>
                  <td className="px-5 py-2 text-right text-muted-foreground">{counts.centralApnea}</td>
                  <td className="px-5 py-2 text-right text-muted-foreground">{counts.hypopnea}</td>
                  <td className="px-5 py-2 text-right text-muted-foreground">{counts.rera}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </PanelCard>
  )
}
