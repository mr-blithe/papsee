import { Star } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ExampleButton } from '@/components/panel/example-button'
import { SITE_CONTAINER } from '@/components/site-container'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { BRAND_NAMES, RECOGNISED_BRANDS } from '@/lib/pap'
import { SOURCE_URL } from '@/lib/site-url'
import { cn } from '@/lib/utils'
import { HeroPreview } from './hero-preview'
import { SignalPreview } from './signal-preview'
import { WhyPapSeeSection } from './why-papsee-section'

const STEPS = [
  { title: 'stepBringTitle', body: 'stepBringBody' },
  { title: 'stepReadTitle', body: 'stepReadBody' },
  { title: 'stepReturnTitle', body: 'stepReturnBody' },
] as const

function PrimaryCta() {
  const t = useTranslations('Landing')

  return (
    <Button
      size="lg"
      nativeButton={false}
      className="h-10 bg-[var(--accent-action)] px-4 text-[var(--accent-action-foreground)] hover:bg-[var(--accent-action)]/85"
      render={<Link href="/sign-up">{t('createAccount')}</Link>}
    />
  )
}

function SourceSection({ sourceUrl }: { sourceUrl: string }) {
  const t = useTranslations('Landing')

  return (
    <section id="source" className="border-b border-border scroll-mt-16">
      <div
        className={cn(SITE_CONTAINER, 'grid gap-8 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16')}
      >
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-signal-pressure uppercase">{t('sourceEyebrow')}</p>
          <h2 className="mt-4 max-w-xl text-3xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
            {t('sourceTitle')}
          </h2>
        </div>
        <div>
          <p className="max-w-xl leading-7 text-muted-foreground">{t('sourceBody')}</p>
          <div className="mt-7">
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              className="h-10 px-4"
              render={
                <a href={sourceUrl} target="_blank" rel="noreferrer">
                  <Star aria-hidden />
                  {t('sourceCta')}
                </a>
              }
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function CtaPair({ centered = false }: { centered?: boolean }) {
  return (
    <div className={centered ? 'flex flex-col justify-center gap-2 sm:flex-row' : 'flex flex-col gap-2 sm:flex-row'}>
      <PrimaryCta />
      <ExampleButton className="h-10 px-4" />
    </div>
  )
}

export function LandingPage() {
  const t = useTranslations('Landing')
  const metadata = useTranslations('Metadata')

  return (
    <div className="min-h-svh overflow-hidden bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="relative">
          <div
            className={cn(
              SITE_CONTAINER,
              'grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-12 lg:py-24',
            )}
          >
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.16em] text-signal-flow uppercase">{t('eyebrow')}</p>
              <h1 className="mt-5 text-4xl leading-[1.04] font-semibold tracking-[-0.045em] text-balance sm:text-5xl lg:text-6xl">
                {t('heroTitle')} <span className="text-muted-foreground">{t('heroTitleAccent')}</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {t('heroBody')}
              </p>
              <div className="mt-8">
                <CtaPair />
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {[t('proofDetail'), t('proofTrends'), t('proofContext')].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="size-1 rounded-full bg-signal-flow" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-signal-flow/15 bg-signal-flow/5 p-3">
              <HeroPreview />
            </div>
          </div>
        </section>

        <WhyPapSeeSection />

        <section id="signals" className={cn(SITE_CONTAINER, 'py-16 sm:py-20 lg:py-24 scroll-mt-16')}>
          <div className="grid gap-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.16em] text-signal-pressure uppercase">
                {t('signalEyebrow')}
              </p>
              <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
                {t('signalTitle')}
              </h2>
              <p className="mt-5 leading-7 text-muted-foreground">{t('signalBody')}</p>
            </div>
            <SignalPreview />
          </div>
        </section>

        <section id="how" className="border-y border-border bg-card scroll-mt-16">
          <div className={cn(SITE_CONTAINER, 'py-16 sm:py-20 lg:py-24')}>
            <div className="max-w-2xl">
              <h2 className="text-3xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
                {t('howTitle')}
              </h2>
            </div>
            <ol className="mt-10 grid border-y border-border md:grid-cols-3 md:divide-x md:divide-border">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="border-b border-border px-1 py-7 last:border-b-0 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0"
                >
                  <span className="text-xs font-medium text-signal-flow tabular-nums">0{index + 1}</span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">{t(step.title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(step.body)}</p>
                </li>
              ))}
            </ol>

            <div className="mt-12 grid gap-5 rounded-2xl border border-border bg-muted/20 p-5 sm:p-7 lg:grid-cols-[0.65fr_1.35fr] lg:items-center lg:gap-12">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-signal-leak uppercase">
                  {t('coverageEyebrow')}
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">{t('coverageTitle')}</h3>
              </div>
              <div>
                <p className="text-sm leading-6 text-muted-foreground">{t('coverageBody')}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {t('coverageRecognised', { brands: RECOGNISED_BRANDS.map((brand) => BRAND_NAMES[brand]).join(', ') })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {SOURCE_URL ? <SourceSection sourceUrl={SOURCE_URL} /> : null}

        <section className={cn(SITE_CONTAINER, 'py-20 text-center sm:py-28')}>
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-signal-flow">{metadata('appName')}</p>
            <h2 className="mt-4 text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {t('closingTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">{t('closingBody')}</p>
            <div className="mt-8">
              <CtaPair centered />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
