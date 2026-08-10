'use client'

import { useState, type FormEvent } from 'react'
import { Check, Loader2, Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TURNSTILE_RESPONSE_FIELD, TurnstileWidget, resetTurnstile } from '@/components/turnstile-widget'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { Locale } from '@/i18n/routing'
import { trackEvent } from '@/lib/analytics'
import { CONTACT_LIMITS, CONTACT_TOPICS } from '@/lib/contact'

const ERROR_KEYS = {
  invalidRequest: 'errorInvalid',
  challengeFailed: 'errorChallenge',
  serviceUnavailable: 'errorUnavailable',
  deliveryFailed: 'errorDelivery',
  notConfigured: 'errorUnavailable',
} as const

type ContactErrorKey = (typeof ERROR_KEYS)[keyof typeof ERROR_KEYS]

async function errorKey(response: Response): Promise<ContactErrorKey> {
  try {
    const body = (await response.json()) as { error?: unknown }
    if (typeof body.error === 'string' && body.error in ERROR_KEYS) {
      return ERROR_KEYS[body.error as keyof typeof ERROR_KEYS]
    }
  } catch {
    return 'errorUnavailable'
  }

  return 'errorUnavailable'
}

export function ContactForm({ locale, siteKey }: { locale: Locale; siteKey: string | null }) {
  const t = useTranslations('Contact')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [failure, setFailure] = useState<ContactErrorKey | null>(null)

  if (!siteKey) {
    return <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">{t('unavailable')}</p>
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)

    setPending(true)
    setSent(false)
    setFailure(null)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          topic: form.get('topic'),
          message: form.get('message'),
          locale,
          turnstileToken: form.get(TURNSTILE_RESPONSE_FIELD),
        }),
      })

      if (!response.ok) {
        setFailure(await errorKey(response))
        resetTurnstile()
        return
      }

      formElement.reset()
      resetTurnstile()
      setSent(true)
      trackEvent('contact_message_sent')
    } catch {
      setFailure('errorUnavailable')
      resetTurnstile()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">{t('name')}</FieldLabel>
            <Input id="name" name="name" autoComplete="name" required maxLength={CONTACT_LIMITS.name} />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={CONTACT_LIMITS.email}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="topic">{t('topic')}</FieldLabel>
          <select
            id="topic"
            name="topic"
            required
            defaultValue="general"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {CONTACT_TOPICS.map((topic) => (
              <option key={topic} value={topic} className="bg-background text-foreground">
                {t(`topic_${topic}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field>
          <FieldLabel htmlFor="message">{t('message')}</FieldLabel>
          <textarea
            id="message"
            name="message"
            required
            maxLength={CONTACT_LIMITS.message}
            rows={8}
            className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
          />
          <FieldDescription>{t('messageHint', { max: CONTACT_LIMITS.message })}</FieldDescription>
        </Field>

        <TurnstileWidget siteKey={siteKey} action="contact" />

        {failure ? <FieldError>{t(failure)}</FieldError> : null}
        {sent ? (
          <p className="inline-flex items-center gap-2 text-sm text-[var(--severity-normal)]" role="status">
            <Check className="size-4" aria-hidden />
            {t('sent')}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          {pending ? t('sending') : t('send')}
        </Button>
      </FieldGroup>
    </form>
  )
}
