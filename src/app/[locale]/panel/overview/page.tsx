import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { OverviewScreen } from '@/components/panel/overview-screen'
import type { Locale } from '@/i18n/routing'
import { DEMO_PROFILE } from '@/lib/therapy/demo'
import { requireStoredDays } from '@/lib/therapy/panel-access'
import { getProfile } from '@/lib/therapy/repository'

export async function generateMetadata(props: PageProps<'/[locale]/panel/overview'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Overview' })

  return { title: t('title'), description: t('description') }
}

export default async function OverviewPage({ params }: PageProps<'/[locale]/panel/overview'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const context = await requireStoredDays(locale as Locale)
  const profile = context.demo ? DEMO_PROFILE : await getProfile(context.userId)

  return (
    <div className="flex-1 space-y-3 p-4 md:p-5">
      <div className="space-y-1">
        <OverviewScreen profile={profile} />
      </div>
    </div>
  )
}
