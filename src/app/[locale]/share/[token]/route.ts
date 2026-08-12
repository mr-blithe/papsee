import { notFound } from 'next/navigation'
import { NextResponse, type NextRequest } from 'next/server'
import { hasLocale } from 'next-intl'
import { getPathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { DEMO_COOKIE } from '@/lib/demo-cookie'
import { setShareCookie } from '@/lib/panel-context'
import { findShareByTokenHash } from '@/lib/therapy/repository'
import { hashShareToken } from '@/lib/therapy/share-token.server'
import { isShareActive } from '@/lib/therapy/shares'

/**
 * Redeeming a link is a handler rather than a page for two reasons: only a handler may set a cookie,
 * and nothing should ever render while the token is still in the address bar, where it would travel
 * on as a referrer.
 */
export async function GET(request: NextRequest, context: RouteContext<'/[locale]/share/[token]'>) {
  const { locale, token } = await context.params
  // A handler runs no layout, so the guard in `[locale]/layout.tsx` never sees this request, and the
  // proxy matcher skips any path carrying a dot. Unchecked, the segment reaches `getPathname` as
  // written and a `/` in it turns the locale prefix into an authority pointing off site.
  if (!hasLocale(routing.locales, locale)) notFound()

  const target = (href: string) => new URL(getPathname({ href, locale }), request.url)

  const share = await findShareByTokenHash(hashShareToken(token))
  if (!share || !isShareActive(share, Date.now())) return NextResponse.redirect(target('/share'))

  const response = NextResponse.redirect(target('/panel/overview'))
  setShareCookie(response, token, share.expiresAt)
  // The example patient outranks a shared view, so a demo cookie left in this browser would serve
  // synthetic nights to someone who came to read a real history.
  response.cookies.delete(DEMO_COOKIE)

  return response
}
