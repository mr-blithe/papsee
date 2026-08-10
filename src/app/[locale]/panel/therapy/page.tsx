import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { TherapyScreen } from '@/components/panel/therapy-screen'
import type { Locale } from '@/i18n/routing'
import { isPapDayKey } from '@/lib/pap'
import { requireStoredDays } from '@/lib/therapy/panel-access'

export async function generateMetadata(props: PageProps<'/[locale]/panel/therapy'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Metadata' })

  return {
    title: t('therapyTitle'),
    description: t('therapyDescription'),
  }
}

export default async function TherapyPage({ params, searchParams }: PageProps<'/[locale]/panel/therapy'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  await requireStoredDays(locale as Locale)

  const { date } = await searchParams
  const requested = typeof date === 'string' && isPapDayKey(date) ? date : null

  return <TherapyScreen initialDate={requested} />
}
