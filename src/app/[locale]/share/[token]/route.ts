import { NextResponse, type NextRequest } from 'next/server'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
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
  const target = (href: string) => new URL(getPathname({ href, locale: locale as Locale }), request.url)

  const share = await findShareByTokenHash(hashShareToken(token))
  if (!share || !isShareActive(share, Date.now())) return NextResponse.redirect(target('/share'))

  const response = NextResponse.redirect(target('/panel/overview'))
  setShareCookie(response, token, share.expiresAt)
  // The example patient outranks a shared view, so a demo cookie left in this browser would serve
  // synthetic nights to someone who came to read a real history.
  response.cookies.delete(DEMO_COOKIE)

  return response
}
