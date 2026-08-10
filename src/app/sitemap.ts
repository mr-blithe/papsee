import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

const LEGAL_PATHS = ['privacy', 'terms', 'contact'] as const
const LEGAL_PRIORITY = 0.3

// Cached by default, and the build machine does not know the domain. See robots.ts.
export const dynamic = 'force-dynamic'

function entry(siteUrl: URL, path: string, priority: number): MetadataRoute.Sitemap[number] {
  const englishUrl = new URL(path, siteUrl).toString()
  const turkishUrl = new URL(`/tr${path === '/' ? '' : path}`, siteUrl).toString()

  return {
    url: englishUrl,
    changeFrequency: 'weekly',
    priority,
    alternates: { languages: { en: englishUrl, tr: turkishUrl, 'x-default': englishUrl } },
  }
}

function localized(siteUrl: URL, path: string, priority: number): MetadataRoute.Sitemap {
  const english = entry(siteUrl, path, priority)

  return [english, { ...english, url: english.alternates?.languages?.tr as string }]
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()

  return [
    ...localized(siteUrl, '/', 1),
    ...LEGAL_PATHS.flatMap((path) => localized(siteUrl, `/${path}`, LEGAL_PRIORITY)),
  ]
}
