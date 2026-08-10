// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import robots from './robots'
import sitemap from './sitemap'

describe('public search metadata', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('lists both localized home pages with reciprocal and default alternates', () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'papsee.example')

    expect(sitemap().slice(0, 2)).toEqual([
      {
        url: 'https://papsee.example/',
        changeFrequency: 'weekly',
        priority: 1,
        alternates: {
          languages: {
            en: 'https://papsee.example/',
            tr: 'https://papsee.example/tr',
            'x-default': 'https://papsee.example/',
          },
        },
      },
      {
        url: 'https://papsee.example/tr',
        changeFrequency: 'weekly',
        priority: 1,
        alternates: {
          languages: {
            en: 'https://papsee.example/',
            tr: 'https://papsee.example/tr',
            'x-default': 'https://papsee.example/',
          },
        },
      },
    ])
  })

  it('lists every policy page the footer links to, in both locales, so neither goes unindexed', () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'papsee.example')

    const urls = sitemap().map((page) => page.url)

    expect(urls).toContain('https://papsee.example/privacy')
    expect(urls).toContain('https://papsee.example/tr/privacy')
    expect(urls).toContain('https://papsee.example/terms')
    expect(urls).toContain('https://papsee.example/tr/terms')
    expect(urls).toContain('https://papsee.example/contact')
    expect(urls).toContain('https://papsee.example/tr/contact')
  })

  it('ranks a policy page below the landing page rather than competing with it', () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'papsee.example')

    const privacy = sitemap().find((page) => page.url === 'https://papsee.example/privacy')

    expect(privacy?.priority).toBeLessThan(1)
    expect(privacy?.alternates?.languages?.tr).toBe('https://papsee.example/tr/privacy')
  })

  it('points crawlers to the localized sitemap and excludes private routes', () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'papsee.example')

    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/panel',
          '/tr/panel',
          '/share',
          '/tr/share',
          '/sign-in',
          '/tr/sign-in',
          '/sign-up',
          '/tr/sign-up',
        ],
      },
      sitemap: 'https://papsee.example/sitemap.xml',
    })
  })
})
