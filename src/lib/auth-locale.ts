import { hasLocale } from 'next-intl'
import { routing, type Locale } from '@/i18n/routing'

export const AUTH_LOCALE_HEADER = 'x-papsee-locale'

export function authMailLocale(headers: Headers | undefined): Locale {
  const requested = headers?.get(AUTH_LOCALE_HEADER)?.trim()
  return hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
}
