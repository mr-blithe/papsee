'use client'

import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { admin } from '@/lib/auth-client'

/**
 * The flag comes from the server and is not read back from a cookie the way the demo one is, and
 * that difference is deliberate. /admin and /panel are sibling segments, so entering remounts this
 * layout and leaving unmounts it; navigating inside /panel keeps a banner that is still true; and
 * an expired impersonation session redirects to sign in. No reachable state leaves it stale.
 */
export function ImpersonationBanner({ impersonating, email }: { impersonating: boolean; email: string }) {
  const t = useTranslations('Impersonation')
  const router = useRouter()
  const [stopping, setStopping] = useState(false)

  if (!impersonating) return null

  const stop = async () => {
    setStopping(true)
    await admin.stopImpersonating()
    router.push('/admin/users')
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-destructive bg-destructive/10 px-4 py-2 text-xs md:px-5">
      <span className="flex min-w-0 items-center gap-2">
        <TriangleAlert className="size-3.5 shrink-0 text-destructive" aria-hidden />
        <span className="min-w-0 text-destructive">{t('banner', { email })}</span>
      </span>
      <Button variant="outline" size="sm" onClick={() => void stop()} disabled={stopping}>
        {t('stop')}
      </Button>
    </div>
  )
}
