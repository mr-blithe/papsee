'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Link2Off, Loader2, Share2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useRouter } from '@/i18n/navigation'
import { apiErrorKey, type ApiErrorMessageKey } from '@/lib/api'
import { createShareLink, revokeShareLink, TherapyApiError } from '@/lib/therapy/client'
import {
  DEFAULT_SHARE_DURATION_MINUTES,
  MAX_ACTIVE_SHARES,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  SHARE_DURATION_MINUTES,
  type ShareDurationMinutes,
  shareUrl,
} from '@/lib/therapy/shares'
import { PanelCard, PanelCardHeader } from './panel-card'

const COPIED_FEEDBACK_MS = 2000

/**
 * `endsIn` is worded by the page rather than here. A link expiry is a real instant, the panel pins
 * next-intl to the device time zone so device clocks read the way the machine wrote them, and a
 * clock read during a client render would disagree with the server's by the time it hydrated.
 * The list therefore comes back from the server after every change instead of being patched here.
 */
export function SharingCard({ links }: { links: { id: string; endsIn: string }[] }) {
  const t = useTranslations('Sharing')
  const errors = useTranslations('ApiErrors')
  const router = useRouter()

  const [minutes, setMinutes] = useState<ShareDurationMinutes>(DEFAULT_SHARE_DURATION_MINUTES)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<{ id: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorKey, setErrorKey] = useState<ApiErrorMessageKey | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return

    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)

    return () => clearTimeout(timer)
  }, [copied])

  const durationLabel = (value: ShareDurationMinutes) => {
    if (value < MINUTES_PER_HOUR) return t('durationMinutes', { minutes: value })
    if (value % MINUTES_PER_DAY === 0) return t('durationDays', { days: value / MINUTES_PER_DAY })

    return t('durationHours', { hours: value / MINUTES_PER_HOUR })
  }

  const create = async () => {
    setCreating(true)
    setErrorKey(null)
    setCreated(null)
    setCopied(false)

    try {
      const { id, token } = await createShareLink(minutes)
      setCreated({ id, url: shareUrl(window.location.origin, token) })
      router.refresh()
    } catch (error) {
      setErrorKey(apiErrorKey(error instanceof TherapyApiError ? error.code : undefined))
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (id: string) => {
    setRevoking(id)
    setErrorKey(null)

    try {
      await revokeShareLink(id)
      setCreated((current) => (current?.id === id ? null : current))
      router.refresh()
    } catch (error) {
      setErrorKey(apiErrorKey(error instanceof TherapyApiError ? error.code : undefined))
    } finally {
      setRevoking(null)
    }
  }

  const copy = async () => {
    if (!created) return

    await navigator.clipboard.writeText(created.url)
    setCopied(true)
  }

  const atLimit = links.length >= MAX_ACTIVE_SHARES

  return (
    <PanelCard>
      <PanelCardHeader title={t('title')} description={t('description')} />

      <div className="space-y-4 px-5 py-4">
        <fieldset disabled={creating}>
          <legend className="pb-2 text-xs text-muted-foreground">{t('durationLabel')}</legend>
          <ToggleGroup
            variant="outline"
            className="flex-wrap"
            value={[String(minutes)]}
            onValueChange={(next) => {
              const chosen = SHARE_DURATION_MINUTES.find((option) => String(option) === next[0])
              if (chosen) setMinutes(chosen)
            }}
          >
            {SHARE_DURATION_MINUTES.map((option) => (
              <ToggleGroupItem key={option} value={String(option)}>
                {durationLabel(option)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>

        <Button onClick={() => void create()} disabled={creating || atLimit}>
          {creating ? <Loader2 className="animate-spin" aria-hidden /> : <Share2 aria-hidden />}
          {t('create')}
        </Button>

        {atLimit ? <p className="text-xs text-muted-foreground">{t('limit', { max: MAX_ACTIVE_SHARES })}</p> : null}
        {errorKey ? <FieldError>{errors(errorKey)}</FieldError> : null}

        {created ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">{t('createdTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('createdBody')}</p>
            <Field className="pt-1">
              <FieldLabel htmlFor="shareLink">{t('linkLabel')}</FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="shareLink" value={created.url} readOnly onFocus={(event) => event.target.select()} />
                <Button variant="outline" className="shrink-0" onClick={() => void copy()}>
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>
            </Field>
          </div>
        ) : null}

        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="text-xs font-medium">{t('activeTitle')}</h3>
          {links.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('none')}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {links.map((link) => (
                <li key={link.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 text-sm">{t('endsIn', { when: link.endsIn })}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={revoking === link.id}
                    onClick={() => void revoke(link.id)}
                  >
                    {revoking === link.id ? <Loader2 className="animate-spin" aria-hidden /> : <Link2Off aria-hidden />}
                    {t('revoke')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{t('note')}</p>
      </div>
    </PanelCard>
  )
}
