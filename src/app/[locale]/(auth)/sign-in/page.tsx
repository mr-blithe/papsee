import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SignInForm } from '@/components/auth/sign-in-form'
import { AuthPageShell } from '@/components/auth/auth-page-shell'
import type { Locale } from '@/i18n/routing'
import { isGoogleEnabled } from '@/lib/auth'
import { authErrorKey } from '@/lib/auth-errors'
import { VERIFIED_SEARCH_PARAM, VERIFIED_SEARCH_VALUE } from '@/lib/auth-verification'
import { requireSignedOut } from '@/lib/session'

export async function generateMetadata(props: PageProps<'/[locale]/sign-in'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Auth' })

  return { title: t('signInTitle'), description: t('signInDescription') }
}

export default async function SignInPage({ params, searchParams }: PageProps<'/[locale]/sign-in'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  await requireSignedOut(locale as Locale)

  const parameters = await searchParams
  const error = parameters.error
  const errorKey = typeof error === 'string' ? authErrorKey(error) : null

  return (
    <AuthPageShell>
      <SignInForm
        googleEnabled={isGoogleEnabled}
        initialErrorKey={errorKey}
        verified={errorKey === null && parameters[VERIFIED_SEARCH_PARAM] === VERIFIED_SEARCH_VALUE}
      />
    </AuthPageShell>
  )
}
