'use client'

import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { leaveDemoMode } from '@/lib/therapy/client'
import { useDemoMode } from './use-demo-mode'

export function DemoBanner({ signedIn, demo }: { signedIn: boolean; demo: boolean }) {
  const t = useTranslations('Demo')
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)
  const inDemo = useDemoMode(demo)

  const exit = async () => {
    setLeaving(true)
    await leaveDemoMode()
    router.push(signedIn ? '/panel/overview' : '/sign-in')
    router.refresh()
  }

  if (!inDemo) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-muted px-4 py-2 text-xs md:px-5">
      <span className="flex items-center gap-2">
        <FlaskConical className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">{t('banner')}</span>
      </span>
      <Button variant="outline" size="sm" onClick={exit} disabled={leaving}>
        {signedIn ? t('exit') : t('exitToSignUp')}
      </Button>
    </div>
  )
}
