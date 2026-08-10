import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SignInForm } from '@/components/auth/sign-in-form'
import { AuthPageShell } from '@/components/auth/auth-page-shell'
import type { Locale } from '@/i18n/routing'
import { isGoogleEnabled } from '@/lib/auth'
import { requireSignedOut } from '@/lib/session'

export async function generateMetadata(props: PageProps<'/[locale]/sign-in'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Auth' })

  return { title: t('signInTitle'), description: t('signInDescription') }
}

export default async function SignInPage({ params }: PageProps<'/[locale]/sign-in'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  await requireSignedOut(locale as Locale)

  return (
    <AuthPageShell>
      <SignInForm googleEnabled={isGoogleEnabled} />
    </AuthPageShell>
  )
}
