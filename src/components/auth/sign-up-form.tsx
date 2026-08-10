'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { GoogleButton } from '@/components/auth/google-button'
import { ExampleButton } from '@/components/panel/example-button'
import { TURNSTILE_RESPONSE_FIELD, TurnstileWidget, resetTurnstile } from '@/components/turnstile-widget'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Link, useRouter } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'
import { signUp } from '@/lib/auth-client'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, authErrorKey, type AuthErrorMessageKey } from '@/lib/auth-errors'
import { LEGAL_ACCEPTANCE_HEADER, LEGAL_ACCEPTANCE_VALUE } from '@/lib/legal-acceptance'

const CAPTCHA_HEADER = 'x-captcha-response'

export function SignUpForm({
  googleEnabled,
  challenge,
  initialErrorKey = null,
}: {
  googleEnabled: boolean
  challenge: { siteKey: string; action: string } | null
  initialErrorKey?: AuthErrorMessageKey | null
}) {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [errorKey, setErrorKey] = useState<AuthErrorMessageKey | null>(initialErrorKey)
  const [mismatch, setMismatch] = useState(false)
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [legalMissing, setLegalMissing] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setErrorKey(null)

    if (String(form.get('password')) !== String(form.get('passwordConfirmation'))) {
      setMismatch(true)
      return
    }

    if (form.get('legalAcceptance') !== LEGAL_ACCEPTANCE_VALUE) {
      setLegalMissing(true)
      return
    }

    setMismatch(false)
    setLegalMissing(false)
    setPending(true)

    const headers = {
      [LEGAL_ACCEPTANCE_HEADER]: LEGAL_ACCEPTANCE_VALUE,
      ...(challenge ? { [CAPTCHA_HEADER]: String(form.get(TURNSTILE_RESPONSE_FIELD) ?? '') } : {}),
    }

    const { error } = await signUp.email(
      {
        name: String(form.get('name')),
        email: String(form.get('email')),
        password: String(form.get('password')),
      },
      { headers },
    )

    if (error) {
      setErrorKey(authErrorKey(error.code))
      resetTurnstile()
      setPending(false)
      return
    }

    trackEvent('sign_up', { method: 'email' })
    router.push('/panel/onboarding')
    router.refresh()
  }

  return (
    <Card className="shadow-2xl shadow-foreground/5">
      <CardHeader>
        <CardTitle>{t('signUpTitle')}</CardTitle>
        <CardDescription>{t('signUpDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">{t('name')}</FieldLabel>
              <Input id="name" name="name" autoComplete="name" required />
            </Field>
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
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
              />
              <FieldDescription>{t('passwordHint', { min: PASSWORD_MIN_LENGTH })}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="passwordConfirmation">{t('passwordConfirmation')}</FieldLabel>
              <Input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                aria-invalid={mismatch || undefined}
                onChange={() => setMismatch(false)}
              />
            </Field>
            <Field data-invalid={legalMissing || undefined}>
              <div className="flex items-start gap-3">
                <input
                  id="legalAcceptance"
                  name="legalAcceptance"
                  type="checkbox"
                  value={LEGAL_ACCEPTANCE_VALUE}
                  checked={legalAccepted}
                  required
                  aria-invalid={legalMissing || undefined}
                  aria-describedby={legalMissing ? 'legalAcceptanceError' : undefined}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--accent-action)]"
                  onInvalid={() => setLegalMissing(true)}
                  onChange={(event) => {
                    setLegalAccepted(event.currentTarget.checked)
                    setLegalMissing(false)
                  }}
                />
                <FieldLabel htmlFor="legalAcceptance" className="block font-normal leading-5">
                  {t.rich('legalAcceptance', {
                    privacy: (chunks) => (
                      <Link
                        href="/privacy"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        {chunks}
                      </Link>
                    ),
                    terms: (chunks) => (
                      <Link
                        href="/terms"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </FieldLabel>
              </div>
              {legalMissing ? (
                <FieldError id="legalAcceptanceError">{t('errorLegalAcceptanceRequired')}</FieldError>
              ) : null}
            </Field>
            {challenge ? <TurnstileWidget siteKey={challenge.siteKey} action={challenge.action} /> : null}
            {mismatch ? <FieldError>{t('errorPasswordMismatch')}</FieldError> : null}
            {errorKey ? (
              <FieldError>{t(errorKey, { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })}</FieldError>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-[var(--accent-action)] text-[var(--accent-action-foreground)] hover:bg-[var(--accent-action)]/85"
              disabled={pending}
            >
              {t('submitSignUp')}
            </Button>
            {googleEnabled ? (
              <>
                <FieldSeparator className="[&_[data-slot=field-separator-content]]:bg-card">
                  {t('separator')}
                </FieldSeparator>
                <GoogleButton
                  requestSignUp
                  legalAccepted={legalAccepted}
                  onLegalAcceptanceRequired={() => setLegalMissing(true)}
                />
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
        {t('toSignIn')}&nbsp;
        <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4">
          {t('toSignInLink')}
        </Link>
      </CardFooter>
    </Card>
  )
}
