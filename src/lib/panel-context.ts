import { cache } from 'react'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import { DEMO_COOKIE, DEMO_COOKIE_VALUE } from '@/lib/demo-cookie'
import { SHARE_COOKIE } from '@/lib/share-cookie'
import { getSession } from '@/lib/session'
import { findShareByTokenHash } from '@/lib/therapy/repository'
import { hashShareToken } from '@/lib/therapy/share-token.server'
import { isShareActive } from '@/lib/therapy/shares'

const DEMO_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24

export type PanelContext =
  | { view: 'account'; userId: string }
  | { view: 'demo'; userId: string | null }
  | { view: 'shared'; userId: string; expiresAt: Date }

export type PanelView = PanelContext['view']

/** Which message a mutating route refuses with, so a reader is told why rather than just no. */
export function readOnlyErrorCode(view: Exclude<PanelView, 'account'>): 'readOnlyDemo' | 'readOnlyShare' {
  return view === 'demo' ? 'readOnlyDemo' : 'readOnlyShare'
}

/**
 * Identity of whose nights a panel screen is reading. Leaving a shared view or the example patient
 * swaps the context while the reader stays on the same route, which is not a navigation and so does
 * not remount anything: passed as a `key`, this discards the previous context's loaded nights
 * instead of leaving them on screen under the new one's heading.
 */
export function panelKey(context: PanelContext): string {
  return `${context.view}:${context.userId ?? ''}`
}

// The layout and the page below it both ask, and a shared view answers from the database, so the
// lookup is deduplicated per request the way getSession is.
const readShare = cache(async (token: string) => findShareByTokenHash(hashShareToken(token)))

/**
 * Whose data the panel is reading, and under what right. A share outranks the reader's own session:
 * someone with an account of their own who follows a link came to read what was shared with them.
 * The example patient outranks both, and the link redeem route clears that cookie for the same reason.
 */
export async function getPanelContext(): Promise<PanelContext | null> {
  const [session, store] = await Promise.all([getSession(), cookies()])

  if (store.get(DEMO_COOKIE)?.value === DEMO_COOKIE_VALUE) return { view: 'demo', userId: session?.user.id ?? null }

  const token = store.get(SHARE_COOKIE)?.value
  if (token) {
    const share = await readShare(token)
    if (share && isShareActive(share, Date.now())) {
      return { view: 'shared', userId: share.userId, expiresAt: share.expiresAt }
    }
  }

  if (session) return { view: 'account', userId: session.user.id }

  return null
}

export async function enterDemo(): Promise<void> {
  const store = await cookies()
  // Deliberately readable by the page. It carries no secret and anyone can set it through
  // POST /api/demo anyway, and the panel shell sits in a layout that React does not re-render on
  // navigation, so the only way its controls can agree with the server is to read the cookie itself.
  store.set(DEMO_COOKIE, DEMO_COOKIE_VALUE, {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DEMO_COOKIE_MAX_AGE_SECONDS,
  })
}

export async function leaveDemo(): Promise<void> {
  const store = await cookies()
  store.delete(DEMO_COOKIE)
}

/**
 * Unlike the demo cookie this one is httpOnly, because the token in it is the credential itself and
 * nothing in the panel needs to read it: the shell learns about a shared view from the server, and
 * entering one is always a fresh document load, so it cannot go stale behind the router cache.
 * `expires` matches the link, so the browser drops it the moment the share does.
 */
export function setShareCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(SHARE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function leaveShare(): Promise<void> {
  const store = await cookies()
  store.delete(SHARE_COOKIE)
}
