'use client'

import { useState } from 'react'
import { Loader2, LogOut, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PanelCard, PanelCardHeader } from '@/components/panel/panel-card'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useRouter } from '@/i18n/navigation'
import { admin } from '@/lib/auth-client'
import { authErrorKey, type AuthErrorMessageKey } from '@/lib/auth-errors'
import { DeleteAccountDialog } from './delete-account-dialog'
import { ImpersonateButton } from './impersonate-button'

type Pending = 'sessions' | null

export function UserActions({
  userId,
  email,
  banned,
  isSelf,
}: {
  userId: string
  email: string
  banned: boolean
  isSelf: boolean
}) {
  const t = useTranslations('AdminUsers')
  const errors = useTranslations('Auth')
  const router = useRouter()

  const [pending, setPending] = useState<Pending>(null)
  const [errorKey, setErrorKey] = useState<AuthErrorMessageKey | null>(null)

  const run = async (action: Exclude<Pending, null>, call: () => Promise<{ error?: { code?: string } | null }>) => {
    setPending(action)
    setErrorKey(null)

    const { error } = await call()
    if (error) {
      setErrorKey(authErrorKey(error.code))
      setPending(null)
      return
    }

    setPending(null)
    router.refresh()
  }

  return (
    <PanelCard>
      <PanelCardHeader title={t('actionsTitle')} description={t('actionsDescription')} />
      <div className="space-y-3 px-5 py-4">
        {isSelf ? (
          <p className="text-xs text-muted-foreground">{t('cannotActOnSelf')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pending !== null}
              onClick={() => void run('sessions', () => admin.revokeUserSessions({ userId }))}
            >
              {pending === 'sessions' ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
              {t('revokeSessions')}
            </Button>

            <ImpersonateButton userId={userId} email={email} banned={banned} />
          </div>
        )}

        {errorKey ? <FieldError>{errors(errorKey)}</FieldError> : null}
      </div>
    </PanelCard>
  )
}

export function SuspendCard({ userId, banned }: { userId: string; banned: boolean }) {
  const t = useTranslations('AdminUsers')
  const errors = useTranslations('Auth')
  const router = useRouter()

  const [pending, setPending] = useState(false)
  const [reason, setReason] = useState('')
  const [errorKey, setErrorKey] = useState<AuthErrorMessageKey | null>(null)

  const toggle = async () => {
    setPending(true)
    setErrorKey(null)

    const { error } = banned
      ? await admin.unbanUser({ userId })
      : await admin.banUser({ userId, ...(reason.trim() ? { banReason: reason.trim() } : {}) })

    if (error) {
      setErrorKey(authErrorKey(error.code))
      setPending(false)
      return
    }

    setReason('')
    setPending(false)
    router.refresh()
  }

  return (
    <PanelCard>
      <PanelCardHeader title={t('suspendTitle')} description={t('suspendDescription')} />
      <div className="space-y-4 px-5 py-4">
        {banned ? null : (
          <Field>
            <FieldLabel htmlFor="ban-reason">{t('banReasonLabel')}</FieldLabel>
            <Input
              id="ban-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('banReasonPlaceholder')}
            />
          </Field>
        )}

        <Button variant={banned ? 'outline' : 'destructive'} size="sm" disabled={pending} onClick={() => void toggle()}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : banned ? (
            <ShieldCheck aria-hidden />
          ) : (
            <ShieldOff aria-hidden />
          )}
          {banned ? t('unban') : t('ban')}
        </Button>

        {errorKey ? <FieldError>{errors(errorKey)}</FieldError> : null}
      </div>
    </PanelCard>
  )
}

export function DeleteCard({ userId, email }: { userId: string; email: string }) {
  const t = useTranslations('AdminUsers')
  const router = useRouter()

  const [confirming, setConfirming] = useState(false)

  return (
    <PanelCard className="border-destructive/40">
      <PanelCardHeader title={t('deleteTitle')} description={t('deleteDescription')} />
      <div className="px-5 py-4">
        <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 aria-hidden />
          {t('delete')}
        </Button>
      </div>

      <DeleteAccountDialog
        userId={userId}
        email={email}
        open={confirming}
        onOpenChange={setConfirming}
        onDeleted={() => router.push('/admin/users')}
      />
    </PanelCard>
  )
}
