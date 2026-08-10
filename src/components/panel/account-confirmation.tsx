'use client'

import { useState } from 'react'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useResendCooldown } from '@/hooks/use-resend-cooldown'
import { CONFIRMATION_CODE_LENGTH, type AccountAction } from '@/lib/account-confirmation'
import { apiErrorKey, type ApiErrorMessageKey } from '@/lib/api'
import { AUTH_LOCALE_HEADER } from '@/lib/auth-locale'

async function requestCode(
  action: AccountAction,
  password: string,
  locale: string,
): Promise<ApiErrorMessageKey | null> {
  const response = await fetch('/api/account/confirmation', {
    method: 'POST',
    headers: { 'content-type': 'application/json', [AUTH_LOCALE_HEADER]: locale },
    body: JSON.stringify({ action, ...(password ? { password } : {}) }),
  })

  if (response.ok) return null

  const body = (await response.json().catch(() => ({}))) as { error?: unknown }

  return apiErrorKey(typeof body.error === 'string' ? body.error : undefined)
}

export function AccountConfirmation({
  action,
  hasPassword,
  warning,
  submitLabel,
  pending,
  errorMessage,
  onConfirm,
}: {
  action: AccountAction
  hasPassword: boolean
  warning: string
  submitLabel: string
  pending: boolean
  errorMessage: string | null
  onConfirm: (code: string, password: string) => void
}) {
  const t = useTranslations('Settings')
  const errors = useTranslations('ApiErrors')
  const locale = useLocale()

  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorKey, setErrorKey] = useState<ApiErrorMessageKey | null>(null)
  const cooldown = useResendCooldown()

  const send = async () => {
    setSending(true)
    setErrorKey(null)

    const failure = await requestCode(action, password, locale)
    setSending(false)

    if (failure) {
      setErrorKey(failure)
      return
    }

    cooldown.restart()
    setCode('')
    setSent(true)
  }

  if (!sent) {
    return (
      <div className="space-y-3">
        {hasPassword ? (
          <Field>
            <FieldLabel htmlFor={`${action}-password`}>{t('confirmPassword')}</FieldLabel>
            <Input
              id={`${action}-password`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.currentTarget.value)
                setErrorKey(null)
              }}
            />
            <FieldDescription>{t('confirmPasswordHint')}</FieldDescription>
          </Field>
        ) : (
          <p className="text-sm text-muted-foreground">{t('confirmNoPasswordHint')}</p>
        )}
        {errorKey ? <FieldError>{errors(errorKey)}</FieldError> : null}
        <Button variant="outline" disabled={sending || (hasPassword && password.length === 0)} onClick={send}>
          {sending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {t('confirmSendCode')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor={`${action}-code`}>{t('confirmCode')}</FieldLabel>
        <InputOTP
          id={`${action}-code`}
          maxLength={CONFIRMATION_CODE_LENGTH}
          value={code}
          inputMode="numeric"
          pattern={REGEXP_ONLY_DIGITS}
          autoComplete="one-time-code"
          onChange={setCode}
        >
          <InputOTPGroup>
            {Array.from({ length: CONFIRMATION_CODE_LENGTH }, (_, slot) => (
              <InputOTPSlot key={slot} index={slot} className="size-11 text-base" />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <FieldDescription>{t('confirmCodeHint')}</FieldDescription>
      </Field>

      <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        {warning}
      </p>

      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
      {errorKey ? <FieldError>{errors(errorKey)}</FieldError> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          disabled={pending || code.length < CONFIRMATION_CODE_LENGTH}
          onClick={() => onConfirm(code, password)}
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <TriangleAlert aria-hidden />}
          {submitLabel}
        </Button>
        <Button variant="outline" disabled={sending || cooldown.remaining > 0} onClick={send}>
          {cooldown.remaining > 0 ? t('confirmResendWait', { seconds: cooldown.remaining }) : t('confirmResend')}
        </Button>
      </div>
    </div>
  )
}
