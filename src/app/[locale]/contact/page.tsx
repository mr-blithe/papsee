import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ContactForm } from '@/components/contact-form'
import { SitePageShell } from '@/components/site-page-shell'
import type { Locale } from '@/i18n/routing'

export async function generateMetadata(props: PageProps<'/[locale]/contact'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Legal' })

  return { title: t('contactTitle'), description: t('contactIntro') }
}

export default async function ContactPage({ params }: PageProps<'/[locale]/contact'>) {
  const { locale } = await params
  const activeLocale = locale as Locale
  setRequestLocale(activeLocale)
  const t = await getTranslations('Contact')
  const legal = await getTranslations('Legal')
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null

  return (
    <SitePageShell>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)] lg:gap-16">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-signal-flow uppercase">{t('eyebrow')}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{legal('contactTitle')}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{legal('contactIntro')}</p>
          <div className="mt-8">
            <ContactForm locale={activeLocale} siteKey={siteKey} />
          </div>
        </div>

        <aside className="space-y-7 lg:pt-20">
          <section>
            <h2 className="text-sm font-semibold">{t('responseTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('responseBody')}</p>
          </section>
          <section className="border-t border-border pt-7">
            <h2 className="text-sm font-semibold">{t('privacyTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('privacyBody')}</p>
          </section>
          <section className="border-t border-border pt-7">
            <h2 className="text-sm font-semibold">{t('medicalTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('medicalBody')}</p>
          </section>
        </aside>
      </div>
    </SitePageShell>
  )
}
