'use client'

import { useState } from 'react'
import { Ellipsis, IdCard, Loader2, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Link, useRouter } from '@/i18n/navigation'
import { admin } from '@/lib/auth-client'
import { authErrorKey, type AuthErrorMessageKey } from '@/lib/auth-errors'
import { DeleteAccountDialog } from './delete-account-dialog'

export function UserRowActions({
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

  const [pending, setPending] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [errorKey, setErrorKey] = useState<AuthErrorMessageKey | null>(null)

  // Better Auth refuses both of these on your own account anyway, but an action that is offered and
  // then refused reads as a bug, so the row simply does not offer them.
  if (isSelf) return null

  const toggleBan = async () => {
    setPending(true)
    setErrorKey(null)

    const { error } = banned ? await admin.unbanUser({ userId }) : await admin.banUser({ userId })
    if (error) {
      setErrorKey(authErrorKey(error.code))
      setPending(false)
      return
    }

    setPending(false)
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={t('rowActions')} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Ellipsis aria-hidden />}
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href={`/admin/users/${userId}`} />}>
              <IdCard aria-hidden />
              {t('open')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void toggleBan()}>
              {banned ? <ShieldCheck aria-hidden /> : <ShieldOff aria-hidden />}
              {banned ? t('unban') : t('ban')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmingDelete(true)}>
              <Trash2 aria-hidden />
              {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteAccountDialog userId={userId} email={email} open={confirmingDelete} onOpenChange={setConfirmingDelete} />

      {errorKey ? <span className="block text-xs text-destructive">{errors(errorKey)}</span> : null}
    </>
  )
}
