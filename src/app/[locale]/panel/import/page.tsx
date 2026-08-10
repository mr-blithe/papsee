import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ImportScreen } from '@/components/panel/import-screen'
import type { Locale } from '@/i18n/routing'
import { isDeviceGuideId } from '@/lib/therapy/device-guides'
import { requireOnboarded } from '@/lib/therapy/panel-access'
import { getProfile } from '@/lib/therapy/repository'

export async function generateMetadata(props: PageProps<'/[locale]/panel/import'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Import' })

  return { title: t('title'), description: t('description') }
}

export default async function ImportPage({ params }: PageProps<'/[locale]/panel/import'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const userId = await requireOnboarded(locale as Locale)
  const profile = await getProfile(userId)
  const device = profile?.deviceGuide && isDeviceGuideId(profile.deviceGuide) ? profile.deviceGuide : null

  return (
    <div className="flex-1 p-4 md:p-5">
      <ImportScreen device={device} />
    </div>
  )
}
