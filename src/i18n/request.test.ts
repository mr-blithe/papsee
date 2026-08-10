import { createFormatter } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import { papDayDate } from '@/lib/pap'
import requestConfig from './request'

vi.mock('next-intl/server', () => ({ getRequestConfig: <T>(config: T) => config }))

async function timeZoneFor(locale: string): Promise<string> {
  const config = await requestConfig({ requestLocale: Promise.resolve(locale), locale })
  if (!config.timeZone) throw new Error('the request config has no time zone')
  return config.timeZone
}

describe('the zone a therapy day is rendered in', () => {
  it('renders the day the device recorded, not the day the rendering machine happens to be on', async () => {
    const format = createFormatter({ locale: 'en', timeZone: await timeZoneFor('en') })

    expect(format.dateTime(papDayDate('2026-08-08'), { day: 'numeric', month: 'short', year: 'numeric' })).toBe(
      'Aug 8, 2026',
    )
  })

  it('holds for every locale the app ships, so a reader cannot see two different dates', async () => {
    const format = createFormatter({ locale: 'tr', timeZone: await timeZoneFor('tr') })

    expect(format.dateTime(papDayDate('2026-08-08'), { day: 'numeric', month: 'short', year: 'numeric' })).toBe(
      '8 Ağu 2026',
    )
  })
})
