import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

export const VERIFIED_SEARCH_PARAM = 'verified'
export const VERIFIED_SEARCH_VALUE = '1'

export function verificationCallbackPath(locale: Locale): string {
  return getPathname({
    href: { pathname: '/sign-in', query: { [VERIFIED_SEARCH_PARAM]: VERIFIED_SEARCH_VALUE } },
    locale,
  })
}
