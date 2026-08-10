'use client'

import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useRouter } from '@/i18n/navigation'
import { apiErrorKey, type ApiErrorMessageKey } from '@/lib/api'
import { updateUser } from '@/lib/auth-client'
import { saveProfile, TherapyApiError } from '@/lib/therapy/client'
import { DEVICE_COVERAGE, DEVICE_GUIDE_IDS, type DeviceGuideId } from '@/lib/therapy/device-guides'
import { ExampleButton } from './example-button'
import { ProfileFields, type ProfileFieldValues } from './profile-fields'
import { PanelCard } from './panel-card'

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? '').trim()
  if (text.length === 0) return null
  const parsed = Number(text)

  return Number.isFinite(parsed) ? parsed : null
}

function optionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim()

  return text.length === 0 ? null : text
}

export function OnboardingForm({
  name,
  today,
  profile,
}: {
  name: string
  today: string
  profile: Omit<ProfileFieldValues, 'name'> & { device: DeviceGuideId | null }
}) {
  const t = useTranslations('Onboarding')
  const actions = useTranslations('Actions')
  const errors = useTranslations('ApiErrors')
  const devices = useTranslations('Devices')
  const router = useRouter()

  const [guide, setGuide] = useState<DeviceGuideId | null>(profile.device)
  const [pending, setPending] = useState(false)
  const [missingDevice, setMissingDevice] = useState(false)
  const [errorKey, setErrorKey] = useState<ApiErrorMessageKey | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!guide) {
      setMissingDevice(true)
      return
    }

    const form = new FormData(event.currentTarget)
    setPending(true)
    setErrorKey(null)

    try {
      const chosenName = optionalText(form.get('name'))
      if (chosenName && chosenName !== name) await updateUser({ name: chosenName })

      await saveProfile({
        bornOn: optionalText(form.get('bornOn')),
        heightCm: optionalNumber(form.get('heightCm')),
        weightKg: optionalNumber(form.get('weightKg')),
        diagnosedOn: optionalText(form.get('diagnosedOn')),
        diagnosisAhi: optionalNumber(form.get('diagnosisAhi')),
        deviceGuide: guide,
      })

      router.push('/panel/import')
      router.refresh()
    } catch (error) {
      setErrorKey(apiErrorKey(error instanceof TherapyApiError ? error.code : undefined))
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <PanelCard className="p-5">
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="device">{t('device')}</FieldLabel>
              <ToggleGroup
                id="device"
                variant="outline"
                orientation="vertical"
                className="w-full"
                value={guide ? [guide] : []}
                onValueChange={(next) => {
                  setGuide((next[0] as DeviceGuideId | undefined) ?? null)
                  setMissingDevice(false)
                }}
              >
                {DEVICE_GUIDE_IDS.map((id) => (
                  <ToggleGroupItem key={id} value={id} className="w-full justify-start gap-2">
                    <span>{devices(id)}</span>
                    {DEVICE_COVERAGE[id] === 'unknown' ? null : (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {DEVICE_COVERAGE[id] === 'verified' ? devices('coverageVerified') : devices('coverageRead')}
                      </span>
                    )}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription>{t('deviceHint')}</FieldDescription>
              {missingDevice ? <FieldError>{t('deviceRequired')}</FieldError> : null}
            </Field>

            <ProfileFields today={today} values={{ ...profile, name }} />

            <FieldDescription>{t('optionalHint')}</FieldDescription>

            {errorKey ? <FieldError>{errors(errorKey)}</FieldError> : null}

            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {actions('continueToImport')}
            </Button>

            <FieldSeparator className="[&_[data-slot=field-separator-content]]:bg-card">
              {t('orSeparator')}
            </FieldSeparator>
            <ExampleButton />
            <FieldDescription>{t('exampleHint')}</FieldDescription>
          </FieldGroup>
        </form>
      </PanelCard>
    </div>
  )
}
