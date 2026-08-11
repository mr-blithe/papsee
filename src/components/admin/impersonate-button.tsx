'use client'

import { useState } from 'react'
import { Eye, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FieldError } from '@/components/ui/field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useRouter } from '@/i18n/navigation'
import { admin } from '@/lib/auth-client'
import { authErrorKey, type AuthErrorMessageKey } from '@/lib/auth-errors'

/**
 * Opening somebody's account is the one thing here that reaches their therapy data, so it never
 * happens on a single click. The confirmation names the account rather than asking for it back:
 * the answer is on screen, so typing it would prove nothing. What makes this safe to undo is the
 * short session and the banner it puts across every panel screen.
 */
export function ImpersonateButton({ userId, email, banned }: { userId: string; email: string; banned: boolean }) {
  const t = useTranslations('AdminUsers')
  const errors = useTranslations('Auth')
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [errorKey, setErrorKey] = useState<AuthErrorMessageKey | null>(null)

  const start = async () => {
    setPending(true)
    setErrorKey(null)

    const { error } = await admin.impersonateUser({ userId })
    if (error) {
      setErrorKey(authErrorKey(error.code))
      setPending(false)
      return
    }

    router.push('/panel/overview')
    router.refresh()
  }

  return (
    <>
      {banned ? (
        // The plugin refuses to mint a session for a suspended account, so a button that was
        // offered and then failed would read as a bug rather than as the rule it is.
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="outline" size="sm" disabled className="disabled:pointer-events-auto" />}
          >
            <Eye aria-hidden />
            {t('impersonate')}
          </TooltipTrigger>
          <TooltipContent>{t('impersonateBlockedBanned')}</TooltipContent>
        </Tooltip>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Eye aria-hidden />
          {t('impersonate')}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-sm font-semibold tracking-tight">
            {t('impersonateConfirmTitle', { email })}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">{t('impersonateConfirmBody')}</DialogDescription>

          {errorKey ? <FieldError>{errors(errorKey)}</FieldError> : null}

          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="sm" />}>{t('cancel')}</DialogClose>
            <Button variant="destructive" size="sm" disabled={pending} onClick={() => void start()}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {t('impersonateConfirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
