import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing, type Locale } from '@/i18n/routing'
import { DEMO_COOKIE, DEMO_COOKIE_VALUE } from '@/lib/demo-cookie'
import { SHARE_COOKIE } from '@/lib/share-cookie'

const handleI18n = createMiddleware(routing)

const PANEL_PATHNAME = '/panel'
const ADMIN_PATHNAME = '/admin'
const SIGN_IN_PATHNAME = '/sign-in'

function splitLocale(pathname: string): { locale: Locale; pathnameWithoutLocale: string } {
  const prefixed = routing.locales.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))

  return prefixed
    ? { locale: prefixed, pathnameWithoutLocale: pathname.slice(prefixed.length + 1) || '/' }
    : { locale: routing.defaultLocale, pathnameWithoutLocale: pathname }
}

function localize(pathname: string, locale: Locale): string {
  return locale === routing.defaultLocale ? pathname : `/${locale}${pathname}`
}

function isUnder(pathname: string, area: string): boolean {
  return pathname === area || pathname.startsWith(`${area}/`)
}

export function proxy(request: NextRequest): NextResponse {
  const response = handleI18n(request)
  if (response.headers.has('location')) return response

  const { locale, pathnameWithoutLocale } = splitLocale(request.nextUrl.pathname)
  const panel = isUnder(pathnameWithoutLocale, PANEL_PATHNAME)
  const admin = isUnder(pathnameWithoutLocale, ADMIN_PATHNAME)

  if (!panel && !admin) return response
  if (getSessionCookie(request)) return response

  const demo = request.cookies.get(DEMO_COOKIE)?.value === DEMO_COOKIE_VALUE
  // Presence only, like the session cookie above: the token behind a shared view is checked against
  // the database in getPanelContext, and a stray cookie buys nothing but a bounce one page later.
  const shared = request.cookies.has(SHARE_COOKIE)
  // Both are credentials for reading therapy data and neither says who the reader is, so they open
  // the panel and never the admin area.
  if (panel && (demo || shared)) return response

  const signIn = NextResponse.redirect(new URL(localize(SIGN_IN_PATHNAME, locale), request.url))
  for (const cookie of response.headers.getSetCookie()) {
    signIn.headers.append('set-cookie', cookie)
  }

  return signIn
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
