const LOCAL_SITE_URL = 'http://localhost:3000'

export const SOURCE_URL = process.env.NEXT_PUBLIC_SOURCE_URL

export function getSiteUrl(
  productionDomain = process.env.SITE_DOMAIN || process.env.VERCEL_PROJECT_PRODUCTION_URL,
): URL {
  return new URL(productionDomain ? `https://${productionDomain}` : LOCAL_SITE_URL)
}
