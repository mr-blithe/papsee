'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { trackEvent } from '@/lib/analytics'
import { signIn } from '@/lib/auth-client'
import { LEGAL_ACCEPTANCE_HEADER, LEGAL_ACCEPTANCE_VALUE } from '@/lib/legal-acceptance'

export function GoogleButton({
  requestSignUp = false,
  legalAccepted = false,
  onLegalAcceptanceRequired,
}: {
  requestSignUp?: boolean
  legalAccepted?: boolean
  onLegalAcceptanceRequired?: () => void
}) {
  const t = useTranslations('Auth')
  const locale = useLocale() as Locale
  const [pending, setPending] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={pending}
      onClick={() => {
        if (requestSignUp && !legalAccepted) {
          onLegalAcceptanceRequired?.()
          return
        }

        setPending(true)
        trackEvent(requestSignUp ? 'sign_up' : 'sign_in', { method: 'google' })
        void signIn.social(
          {
            provider: 'google',
            callbackURL: getPathname({ href: '/panel/therapy', locale }),
            errorCallbackURL: getPathname({ href: requestSignUp ? '/sign-up' : '/sign-in', locale }),
            requestSignUp: requestSignUp || undefined,
          },
          requestSignUp ? { headers: { [LEGAL_ACCEPTANCE_HEADER]: LEGAL_ACCEPTANCE_VALUE } } : undefined,
        )
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-4">
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4h6.6c-.1 1.1-.9 2.8-2.5 3.9l3.9 3c2.3-2.1 3.5-5.2 3.5-8.7Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5l-3.9 3C3.5 21.3 7.4 24 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4l-4-3C.5 8.3 0 10.1 0 12s.5 3.7 1.4 5.3l3.9-2.9Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.7c2.2 0 3.7.9 4.5 1.7l3.4-3.3C17.9 1.2 15.2 0 12 0 7.4 0 3.5 2.7 1.4 6.7l3.9 3c1-2.9 3.6-5 6.7-5Z"
        />
      </svg>
      {t('continueWithGoogle')}
    </Button>
  )
}
