'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { leaveSharedView } from '@/lib/therapy/client'

/**
 * `endsIn` arrives already worded because a share expiry is a real instant, and the panel pins
 * next-intl to the device time zone so device clocks read the way the machine wrote them. Wording it
 * once on the server keeps the reader's own clock out of the render and leaves nothing to rehydrate.
 */
export function SharedBanner({ endsIn, signedIn }: { endsIn: string; signedIn: boolean }) {
  const t = useTranslations('Sharing')
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  const close = async () => {
    setLeaving(true)
    await leaveSharedView()
    router.replace(signedIn ? '/panel/overview' : '/')
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-muted px-4 py-2 text-xs md:px-5">
      <span className="flex items-center gap-2">
        <Eye className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">{t('viewerBanner', { when: endsIn })}</span>
      </span>
      <Button variant="outline" size="sm" onClick={() => void close()} disabled={leaving}>
        {t('leave')}
      </Button>
    </div>
  )
}
