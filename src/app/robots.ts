import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

const PRIVATE_ROUTES = ['/api/', '/panel', '/tr/panel', '/sign-in', '/tr/sign-in', '/sign-up', '/tr/sign-up']

// Next caches this route by default, which would bake in whichever domain the build machine knew
// about. A self hosted image is built before anyone has said where it will be served from.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: PRIVATE_ROUTES,
    },
    sitemap: new URL('/sitemap.xml', getSiteUrl()).toString(),
  }
}
