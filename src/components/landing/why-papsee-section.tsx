import { useTranslations } from 'next-intl'
import { SITE_CONTAINER } from '@/components/site-container'
import { cn } from '@/lib/utils'

const REASONS = [
  { title: 'accessTitle', body: 'accessBody', color: 'bg-signal-flow' },
  { title: 'sharingTitle', body: 'sharingBody', color: 'bg-signal-pressure' },
  { title: 'deviceHistoryTitle', body: 'deviceHistoryBody', color: 'bg-signal-respiration' },
  { title: 'durableHistoryTitle', body: 'durableHistoryBody', color: 'bg-signal-leak' },
  { title: 'exportTitle', body: 'exportBody', color: 'bg-signal-flow' },
  { title: 'dataControlTitle', body: 'dataControlBody', color: 'bg-signal-pressure' },
] as const

export function WhyPapSeeSection() {
  const t = useTranslations('Landing')

  return (
    <section id="why" className="border-y border-border bg-muted/20 scroll-mt-16">
      <div className={cn(SITE_CONTAINER, 'py-16 sm:py-20 lg:py-24')}>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-signal-respiration uppercase">
              {t('whyEyebrow')}
            </p>
            <h2 className="mt-4 max-w-xl text-3xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              {t('whyTitle')}
            </h2>
          </div>
          <p className="max-w-xl leading-7 text-muted-foreground">{t('whyBody')}</p>
        </div>

        <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:mt-12 lg:grid-cols-3">
          {REASONS.map((reason, index) => (
            <li key={reason.title} className="bg-background p-5 sm:min-h-52 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground tabular-nums">0{index + 1}</span>
                <span className={cn('h-0.5 w-8', reason.color)} aria-hidden />
              </div>
              <h3 className="mt-5 text-base font-semibold tracking-tight">{t(reason.title)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(reason.body)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
