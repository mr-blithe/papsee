import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LandingPage } from '@/components/landing/landing-page'
import type { Locale } from '@/i18n/routing'

const HOME_PATHS: Record<Locale, string> = { en: '/', tr: '/tr' }
const HOME_ALTERNATES = { ...HOME_PATHS, 'x-default': HOME_PATHS.en }
const OPEN_GRAPH_LOCALES: Record<Locale, string> = { en: 'en_US', tr: 'tr_TR' }

export async function generateMetadata(props: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await props.params
  const activeLocale = locale as Locale
  const t = await getTranslations({ locale: activeLocale, namespace: 'Landing' })
  const metadata = await getTranslations({ locale: activeLocale, namespace: 'Metadata' })

  return {
    title: { absolute: t('seoTitle') },
    description: t('seoDescription'),
    alternates: {
      canonical: HOME_PATHS[activeLocale],
      languages: HOME_ALTERNATES,
    },
    openGraph: {
      type: 'website',
      siteName: metadata('appName'),
      title: t('seoTitle'),
      description: t('seoDescription'),
      url: HOME_PATHS[activeLocale],
      locale: OPEN_GRAPH_LOCALES[activeLocale],
      alternateLocale: Object.values(OPEN_GRAPH_LOCALES).filter(
        (alternateLocale) => alternateLocale !== OPEN_GRAPH_LOCALES[activeLocale],
      ),
    },
    twitter: {
      card: 'summary',
      title: t('seoTitle'),
      description: t('seoDescription'),
    },
    robots: { index: true, follow: true },
  }
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  return <LandingPage />
}
