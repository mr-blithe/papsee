'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { patientAge, PROFILE_LIMITS } from '@/lib/therapy/profile-input'
import { DateField } from './date-field'

export interface ProfileFieldValues {
  name: string
  bornOn: string | null
  heightCm: number | null
  weightKg: number | null
  diagnosedOn: string | null
  diagnosisAhi: number | null
}

export function ProfileFields({ today, values }: { today: string; values: ProfileFieldValues }) {
  const t = useTranslations('Onboarding')
  const [bornOn, setBornOn] = useState(values.bornOn)
  const [diagnosedOn, setDiagnosedOn] = useState(values.diagnosedOn)

  const age = bornOn ? patientAge(bornOn, today) : null

  return (
    <>
      <Field>
        <FieldLabel htmlFor="name">{t('name')}</FieldLabel>
        <Input id="name" name="name" defaultValue={values.name} autoComplete="name" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="bornOn">{t('bornOn')}</FieldLabel>
          <DateField
            id="bornOn"
            name="bornOn"
            value={bornOn}
            min={PROFILE_LIMITS.earliestBirthDate}
            max={today}
            onChange={setBornOn}
          />
          {age === null ? null : <FieldDescription>{t('age', { years: age })}</FieldDescription>}
        </Field>
        <Field>
          <FieldLabel htmlFor="heightCm">{t('height')}</FieldLabel>
          <Input
            id="heightCm"
            name="heightCm"
            type="number"
            inputMode="numeric"
            defaultValue={values.heightCm ?? ''}
            min={PROFILE_LIMITS.heightCm.min}
            max={PROFILE_LIMITS.heightCm.max}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="weightKg">{t('weight')}</FieldLabel>
          <Input
            id="weightKg"
            name="weightKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            defaultValue={values.weightKg ?? ''}
            min={PROFILE_LIMITS.weightKg.min}
            max={PROFILE_LIMITS.weightKg.max}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="diagnosedOn">{t('diagnosedOn')}</FieldLabel>
          <DateField id="diagnosedOn" name="diagnosedOn" value={diagnosedOn} max={today} onChange={setDiagnosedOn} />
        </Field>
        <Field>
          <FieldLabel htmlFor="diagnosisAhi">{t('diagnosisAhi')}</FieldLabel>
          <Input
            id="diagnosisAhi"
            name="diagnosisAhi"
            type="number"
            inputMode="decimal"
            step="0.1"
            defaultValue={values.diagnosisAhi ?? ''}
            min={PROFILE_LIMITS.diagnosisAhi.min}
            max={PROFILE_LIMITS.diagnosisAhi.max}
          />
          <FieldDescription>{t('diagnosisAhiHint')}</FieldDescription>
        </Field>
      </div>
    </>
  )
}
