'use client'

import { useSyncExternalStore } from 'react'
import { usePathname } from '@/i18n/navigation'
import { DEMO_COOKIE, DEMO_COOKIE_VALUE } from '@/lib/demo-cookie'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('focus', onChange)
  document.addEventListener('visibilitychange', onChange)

  return () => {
    window.removeEventListener('focus', onChange)
    document.removeEventListener('visibilitychange', onChange)
  }
}

function readDemoCookie(): boolean {
  return document.cookie.split('; ').includes(`${DEMO_COOKIE}=${DEMO_COOKIE_VALUE}`)
}

/**
 * Whether the reader is looking at the example patient, read from the cookie on every render rather
 * than taken once from the server. The panel shell lives in a layout, and a layout keeps whatever it
 * first rendered across a navigation, so a flag passed down from there goes stale the moment the
 * cookie changes in another tab. `serverValue` is only the first paint, before hydration.
 */
export function useDemoMode(serverValue: boolean): boolean {
  // Subscribes the caller to the router so it re-renders, and re-reads the cookie, on every
  // navigation. The value is otherwise only refreshed when the tab is focused again.
  usePathname()

  return useSyncExternalStore(subscribe, readDemoCookie, () => serverValue)
}
