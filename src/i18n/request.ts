import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { DEVICE_TIME_ZONE } from '@/lib/pap/device-time'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  return {
    locale,
    timeZone: DEVICE_TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
