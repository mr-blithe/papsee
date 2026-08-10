import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SettingsScreen } from '@/components/panel/settings-screen'
import type { Locale } from '@/i18n/routing'
import { getSession, hasPasswordAccount } from '@/lib/session'
import { requireAccount } from '@/lib/therapy/panel-access'
import { countDays } from '@/lib/therapy/repository'

export async function generateMetadata(props: PageProps<'/[locale]/panel/settings'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Settings' })

  return { title: t('accountTitle') }
}

export default async function SettingsPage({ params }: PageProps<'/[locale]/panel/settings'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const userId = await requireAccount(locale as Locale)
  const [session, nights, hasPassword] = await Promise.all([
    getSession(),
    countDays(userId),
    hasPasswordAccount(userId),
  ])

  return (
    <div className="flex-1 p-4 md:p-5">
      <SettingsScreen email={session?.user.email ?? ''} nights={nights} hasPassword={hasPassword} />
    </div>
  )
}
