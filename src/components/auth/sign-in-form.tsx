'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { GoogleButton } from '@/components/auth/google-button'
import { ExampleButton } from '@/components/panel/example-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Link, useRouter } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'
import { signIn } from '@/lib/auth-client'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, authErrorKey, type AuthErrorMessageKey } from '@/lib/auth-errors'

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [errorKey, setErrorKey] = useState<AuthErrorMessageKey | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setErrorKey(null)

    const { error } = await signIn.email({
      email: String(form.get('email')),
      password: String(form.get('password')),
    })

    if (error) {
      setErrorKey(authErrorKey(error.code))
      setPending(false)
      return
    }

    trackEvent('sign_in', { method: 'email' })
    router.push('/panel/overview')
    router.refresh()
  }

  return (
    <Card className="shadow-2xl shadow-foreground/5">
      <CardHeader>
        <CardTitle>{t('signInTitle')}</CardTitle>
        <CardDescription>{t('signInDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
              />
            </Field>
            {errorKey ? (
              <FieldError>{t(errorKey, { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })}</FieldError>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-[var(--accent-action)] text-[var(--accent-action-foreground)] hover:bg-[var(--accent-action)]/85"
              disabled={pending}
            >
              {t('submitSignIn')}
            </Button>
            {googleEnabled ? (
              <>
                <FieldSeparator className="[&_[data-slot=field-separator-content]]:bg-card">
                  {t('separator')}
                </FieldSeparator>
                <GoogleButton />
              </>
            ) : null}
            <FieldSeparator className="[&_[data-slot=field-separator-content]]:bg-card">
              {t('exampleSeparator')}
            </FieldSeparator>
            <ExampleButton className="w-full" />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t('toSignUp')}&nbsp;
        <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-4">
          {t('toSignUpLink')}
        </Link>
      </CardFooter>
    </Card>
  )
}
