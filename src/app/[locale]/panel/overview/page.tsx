import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { OverviewScreen } from '@/components/panel/overview-screen'
import type { Locale } from '@/i18n/routing'
import { panelKey, type PanelContext } from '@/lib/panel-context'
import { DEMO_PROFILE } from '@/lib/therapy/demo'
import { requireStoredDays } from '@/lib/therapy/panel-access'
import { getProfile, type PatientProfile } from '@/lib/therapy/repository'

export async function generateMetadata(props: PageProps<'/[locale]/panel/overview'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Overview' })

  return { title: t('title'), description: t('description') }
}

/**
 * A share link opens the nights, not who the person is: no date of birth, height, weight or
 * diagnosis reaches a reader holding one, so the AHI trend simply loses its diagnosis reference line.
 */
async function readProfile(context: PanelContext): Promise<PatientProfile | null> {
  if (context.view === 'demo') return DEMO_PROFILE
  if (context.view === 'shared') return null

  return getProfile(context.userId)
}

export default async function OverviewPage({ params }: PageProps<'/[locale]/panel/overview'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const context = await requireStoredDays(locale as Locale)
  const profile = await readProfile(context)

  return (
    <div className="flex-1 space-y-3 p-4 md:p-5">
      <div className="space-y-1">
        <OverviewScreen key={panelKey(context)} profile={profile} />
      </div>
    </div>
  )
}
