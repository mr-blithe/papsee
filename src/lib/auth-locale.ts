import { hasLocale } from 'next-intl'
import { routing, type Locale } from '@/i18n/routing'

export const AUTH_LOCALE_HEADER = 'x-papsee-locale'

/**
 * The language an account mail is written in. Better Auth runs its callbacks under `/api/auth`,
 * which sits outside `[locale]`, so next-intl there always resolves the default locale, and the
 * `NEXT_LOCALE` cookie is not a fallback: next-intl only writes it when the cookie is stale or
 * disagrees with `Accept-Language`, so a Turkish reader on a Turkish browser never has one.
 */
export function authMailLocale(headers: Headers | undefined): Locale {
  const requested = headers?.get(AUTH_LOCALE_HEADER)?.trim()
  return hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
}
