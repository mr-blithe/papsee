'use client'

import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'
import { enterDemoMode } from '@/lib/therapy/client'

export function ExampleButton({ className }: { className?: string }) {
  const actions = useTranslations('Actions')
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const enter = async () => {
    setPending(true)
    try {
      await enterDemoMode()
      trackEvent('example_data_opened')
      router.push('/panel/overview')
      router.refresh()
    } catch {
      setPending(false)
    }
  }

  return (
    <Button type="button" variant="outline" className={className} onClick={enter} disabled={pending}>
      <FlaskConical aria-hidden />
      {actions('viewExample')}
    </Button>
  )
}
