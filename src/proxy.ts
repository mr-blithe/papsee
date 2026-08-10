import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing, type Locale } from '@/i18n/routing'
import { DEMO_COOKIE, DEMO_COOKIE_VALUE } from '@/lib/demo-cookie'
import { SHARE_COOKIE } from '@/lib/share-cookie'

const handleI18n = createMiddleware(routing)

const PROTECTED_PATHNAME = '/panel'
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

export function proxy(request: NextRequest): NextResponse {
  const response = handleI18n(request)
  if (response.headers.has('location')) return response

  const { locale, pathnameWithoutLocale } = splitLocale(request.nextUrl.pathname)
  const isProtected =
    pathnameWithoutLocale === PROTECTED_PATHNAME || pathnameWithoutLocale.startsWith(`${PROTECTED_PATHNAME}/`)

  const demo = request.cookies.get(DEMO_COOKIE)?.value === DEMO_COOKIE_VALUE
  // Presence only, like the session cookie above: the token behind a shared view is checked against
  // the database in getPanelContext, and a stray cookie buys nothing but a bounce one page later.
  const shared = request.cookies.has(SHARE_COOKIE)
  if (!isProtected || getSessionCookie(request) || demo || shared) return response

  const signIn = NextResponse.redirect(new URL(localize(SIGN_IN_PATHNAME, locale), request.url))
  for (const cookie of response.headers.getSetCookie()) {
    signIn.headers.append('set-cookie', cookie)
  }

  return signIn
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
