'use client'

import { useState } from 'react'
import { LogOut, Settings as SettingsIcon, UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Link, useRouter } from '@/i18n/navigation'
import { signOut } from '@/lib/auth-client'
import { leaveDemoMode } from '@/lib/therapy/client'

export function UserMenu({ email, demo }: { email: string; demo: boolean }) {
  const t = useTranslations('Auth')
  const actions = useTranslations('Actions')
  const demoCopy = useTranslations('Demo')
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)
    if (demo) await leaveDemoMode()
    await signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t('account')}>
            <UserRound aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="max-w-56 truncate font-normal">{email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {demo ? (
            <Tooltip>
              <TooltipTrigger render={<DropdownMenuItem disabled className="data-disabled:pointer-events-auto" />}>
                <SettingsIcon aria-hidden />
                {actions('settings')}
              </TooltipTrigger>
              <TooltipContent side="left">{demoCopy('inExample')}</TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenuItem render={<Link href="/panel/settings" />}>
              <SettingsIcon aria-hidden />
              {actions('settings')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={pending} onClick={() => void handleSignOut()}>
            <LogOut aria-hidden />
            {t('signOut')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
