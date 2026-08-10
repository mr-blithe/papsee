import type { Metadata } from 'next'
import { Link2Off } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SitePageShell } from '@/components/site-page-shell'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

export async function generateMetadata(props: PageProps<'/[locale]/share'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Sharing' })

  return { title: t('invalidTitle') }
}

export default async function ShareUnavailablePage({ params }: PageProps<'/[locale]/share'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  const t = await getTranslations('Sharing')

  return (
    <SitePageShell className="flex items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <Link2Off className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.02em]">{t('invalidTitle')}</h1>
        <p className="mt-3 leading-7 text-muted-foreground">{t('invalidBody')}</p>
        <Button variant="outline" className="mt-7" nativeButton={false} render={<Link href="/" />}>
          {t('invalidHome')}
        </Button>
      </div>
    </SitePageShell>
  )
}
