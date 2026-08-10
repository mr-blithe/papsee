import { cookies } from 'next/headers'
import { DEMO_COOKIE, DEMO_COOKIE_VALUE } from '@/lib/demo-cookie'
import { getSession } from '@/lib/session'

const DEMO_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24

export type PanelContext = { demo: true; userId: string | null } | { demo: false; userId: string }

export async function getPanelContext(): Promise<PanelContext | null> {
  const [session, store] = await Promise.all([getSession(), cookies()])
  const demo = store.get(DEMO_COOKIE)?.value === DEMO_COOKIE_VALUE

  if (demo) return { demo: true, userId: session?.user.id ?? null }
  if (session) return { demo: false, userId: session.user.id }

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
