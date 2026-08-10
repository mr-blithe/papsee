'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { trackEvent } from '@/lib/analytics'
import { twoFactor } from '@/lib/auth-client'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, authErrorKey, type AuthErrorMessageKey } from '@/lib/auth-errors'
import { AUTH_LOCALE_HEADER } from '@/lib/auth-locale'
import { SIGN_IN_CODE_LENGTH } from '@/lib/auth-mail'

// Better Auth rate limits /two-factor/* to three requests per ten seconds, so the button waits out
// a window rather than letting a second press land on a refusal.
const RESEND_COOLDOWN_SECONDS = 15

export function VerifyOtpForm() {
  const t = useTranslations('Auth')
  const locale = useLocale() as Locale
  const router = useRouter()
  const [code, setCode] = useState('')
  const [errorKey, setErrorKey] = useState<AuthErrorMessageKey | null>(null)
  const [pending, setPending] = useState(false)
  const [trustDevice, setTrustDevice] = useState(true)
  const [resent, setResent] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)

  useEffect(() => {
    if (cooldown === 0) return

    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setErrorKey(null)
    setResent(false)

    const { error } = await twoFactor.verifyOtp({ code, trustDevice })

    if (error) {
      setErrorKey(authErrorKey(error.code))
      setCode('')
      setPending(false)
      return
    }

    trackEvent('sign_in', { method: 'email' })
    router.push('/panel/overview')
    router.refresh()
  }

  async function handleResend() {
    setErrorKey(null)
    setResent(false)
    setCooldown(RESEND_COOLDOWN_SECONDS)

    const { error } = await twoFactor.sendOtp({ fetchOptions: { headers: { [AUTH_LOCALE_HEADER]: locale } } })

    if (error) {
      setErrorKey(authErrorKey(error.code))
      return
    }

    setCode('')
    setResent(true)
  }

  return (
    <Card className="shadow-2xl shadow-foreground/5">
      <CardHeader>
        <CardTitle>{t('verifyTitle')}</CardTitle>
        <CardDescription>{t('verifyDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="code">{t('verifyCode')}</FieldLabel>
              <InputOTP
                id="code"
                name="code"
                maxLength={SIGN_IN_CODE_LENGTH}
                value={code}
                autoFocus
                inputMode="numeric"
                // Anchored, because input-otp tests the whole value and an unanchored pattern
                // matches the empty string inside anything, which turns the filter off.
                pattern={REGEXP_ONLY_DIGITS}
                autoComplete="one-time-code"
                aria-invalid={errorKey !== null || undefined}
                containerClassName="justify-center"
                onChange={(value) => {
                  setCode(value)
                  setErrorKey(null)
                }}
              >
                <InputOTPGroup>
                  {Array.from({ length: SIGN_IN_CODE_LENGTH }, (_, slot) => (
                    <InputOTPSlot key={slot} index={slot} className="size-11 text-base" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </Field>
            <Field>
              <div className="flex items-start gap-3">
                <input
                  id="trustDevice"
                  name="trustDevice"
                  type="checkbox"
                  checked={trustDevice}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--accent-action)]"
                  onChange={(event) => setTrustDevice(event.currentTarget.checked)}
                />
                <FieldLabel htmlFor="trustDevice" className="block font-normal leading-5">
                  {t('verifyTrustDevice')}
                </FieldLabel>
              </div>
              <FieldDescription>{t('verifyTrustDeviceHint')}</FieldDescription>
            </Field>
            {errorKey ? (
              <FieldError>{t(errorKey, { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })}</FieldError>
            ) : null}
            {resent ? (
              <p className="text-sm text-[var(--severity-normal)]" role="status">
                {t('verifyResent')}
              </p>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-[var(--accent-action)] text-[var(--accent-action-foreground)] hover:bg-[var(--accent-action)]/85"
              disabled={pending || code.length < SIGN_IN_CODE_LENGTH}
            >
              {t('verifySubmit')}
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={cooldown > 0} onClick={handleResend}>
              {cooldown > 0 ? t('verifyResendWait', { seconds: cooldown }) : t('verifyResend')}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4">
          {t('verifyBackToSignIn')}
        </Link>
      </CardFooter>
    </Card>
  )
}
