import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { OnboardingForm } from '@/components/panel/onboarding-form'
import type { Locale } from '@/i18n/routing'
import { getSession } from '@/lib/session'
import { isDeviceGuideId } from '@/lib/therapy/device-guides'
import { requireAccount } from '@/lib/therapy/panel-access'
import { todayKey } from '@/lib/therapy/profile-input'
import { getProfile } from '@/lib/therapy/repository'

export async function generateMetadata(props: PageProps<'/[locale]/panel/onboarding'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Onboarding' })

  return { title: t('title'), description: t('description') }
}

export default async function OnboardingPage({ params }: PageProps<'/[locale]/panel/onboarding'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const userId = await requireAccount(locale as Locale)
  const session = await getSession()
  const profile = await getProfile(userId)

  return (
    <div className="flex-1 p-4 md:p-5">
      <OnboardingForm
        name={session?.user.name ?? ''}
        today={todayKey()}
        profile={{
          bornOn: profile?.bornOn ?? null,
          heightCm: profile?.heightCm ?? null,
          weightKg: profile?.weightKg ?? null,
          diagnosedOn: profile?.diagnosedOn ?? null,
          diagnosisAhi: profile?.diagnosisAhi ?? null,
          device: profile?.deviceGuide && isDeviceGuideId(profile.deviceGuide) ? profile.deviceGuide : null,
        }}
      />
    </div>
  )
}
