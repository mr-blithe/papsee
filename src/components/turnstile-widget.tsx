'use client'

import Script from 'next/script'

declare global {
  interface Window {
    turnstile?: { reset: () => void }
  }
}

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

export const TURNSTILE_RESPONSE_FIELD = 'cf-turnstile-response'

export function resetTurnstile() {
  window.turnstile?.reset()
}

export function TurnstileWidget({ siteKey, action }: { siteKey: string; action: string }) {
  return (
    <>
      <Script src={TURNSTILE_SCRIPT_URL} strategy="afterInteractive" />
      <div
        className="cf-turnstile min-h-[65px]"
        data-sitekey={siteKey}
        data-theme="auto"
        data-size="flexible"
        data-action={action}
      />
    </>
  )
}
