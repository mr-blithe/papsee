'use client'

import { useState } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useRouter } from '@/i18n/navigation'
import { admin } from '@/lib/auth-client'
import { authErrorKey, type AuthErrorMessageKey } from '@/lib/auth-errors'

/**
 * Deleting an account cascades to every night, event, waveform and file it owns, so the address has
 * to be typed rather than a short word: the failure this catches is deleting the wrong row.
 */
export function DeleteAccountDialog({
  userId,
  email,
  open,
  onOpenChange,
  onDeleted,
}: {
  userId: string
  email: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const t = useTranslations('AdminUsers')
  const errors = useTranslations('Auth')
  const router = useRouter()

  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(false)
  const [errorKey, setErrorKey] = useState<AuthErrorMessageKey | null>(null)

  const matches = typed.trim().toLocaleLowerCase() === email.toLocaleLowerCase()

  const remove = async () => {
    setPending(true)
    setErrorKey(null)

    const { error } = await admin.removeUser({ userId })
    if (error) {
      setErrorKey(authErrorKey(error.code))
      setPending(false)
      return
    }

    setPending(false)
    setTyped('')
    onOpenChange(false)
    onDeleted?.()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-sm font-semibold tracking-tight">{t('deleteConfirmTitle', { email })}</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">{t('deleteConfirmBody')}</DialogDescription>

        <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t('deleteWarning')}
        </p>

        <Field>
          <FieldLabel htmlFor={`delete-confirm-${userId}`}>{t('deleteConfirmLabel')}</FieldLabel>
          <Input
            id={`delete-confirm-${userId}`}
            value={typed}
            autoComplete="off"
            onChange={(event) => setTyped(event.target.value)}
          />
        </Field>

        {errorKey ? <FieldError>{errors(errorKey)}</FieldError> : null}

        <div className="flex justify-end gap-2">
          <DialogClose render={<Button variant="outline" size="sm" />}>{t('cancel')}</DialogClose>
          <Button variant="destructive" size="sm" disabled={!matches || pending} onClick={() => void remove()}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t('deleteConfirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
