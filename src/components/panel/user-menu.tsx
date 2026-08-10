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
import type { PanelView } from '@/lib/panel-context'
import { leaveDemoMode, leaveSharedView } from '@/lib/therapy/client'
import { useDemoMode } from './use-demo-mode'

export function UserMenu({ email, view }: { email: string; view: PanelView }) {
  const t = useTranslations('Auth')
  const actions = useTranslations('Actions')
  const demoCopy = useTranslations('Demo')
  const sharing = useTranslations('Sharing')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const inDemo = useDemoMode(view === 'demo')
  const reading = inDemo ? 'demo' : view

  async function handleSignOut() {
    setPending(true)
    // Neither cookie is the session, so signing out without dropping them would leave the reader
    // looking at borrowed data with no account behind it.
    if (reading === 'demo') await leaveDemoMode()
    if (reading === 'shared') await leaveSharedView()
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
          {reading === 'account' ? (
            <DropdownMenuItem render={<Link href="/panel/settings" />}>
              <SettingsIcon aria-hidden />
              {actions('settings')}
            </DropdownMenuItem>
          ) : (
            <Tooltip>
              <TooltipTrigger render={<DropdownMenuItem disabled className="data-disabled:pointer-events-auto" />}>
                <SettingsIcon aria-hidden />
                {actions('settings')}
              </TooltipTrigger>
              <TooltipContent side="left">
                {reading === 'demo' ? demoCopy('inExample') : sharing('viewerNotice')}
              </TooltipContent>
            </Tooltip>
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
