import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AuthPageShell } from '@/components/auth/auth-page-shell'
import { VerifyOtpForm } from '@/components/auth/verify-otp-form'
import type { Locale } from '@/i18n/routing'
import { requireSignedOut } from '@/lib/session'

export async function generateMetadata(props: PageProps<'/[locale]/sign-in/verify'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Auth' })

  return { title: t('verifyTitle'), description: t('verifyDescription') }
}

export default async function VerifySignInPage({ params }: PageProps<'/[locale]/sign-in/verify'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  await requireSignedOut(locale as Locale)

  return (
    <AuthPageShell>
      <VerifyOtpForm />
    </AuthPageShell>
  )
}
