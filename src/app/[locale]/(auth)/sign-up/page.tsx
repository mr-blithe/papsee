import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { AuthPageShell } from '@/components/auth/auth-page-shell'
import type { Locale } from '@/i18n/routing'
import { isGoogleEnabled, signUpChallenge } from '@/lib/auth'
import { requireSignedOut } from '@/lib/session'

export async function generateMetadata(props: PageProps<'/[locale]/sign-up'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Auth' })

  return { title: t('signUpTitle'), description: t('signUpDescription') }
}

export default async function SignUpPage({ params }: PageProps<'/[locale]/sign-up'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  await requireSignedOut(locale as Locale)

  return (
    <AuthPageShell>
      <SignUpForm googleEnabled={isGoogleEnabled} challenge={signUpChallenge} />
    </AuthPageShell>
  )
}
