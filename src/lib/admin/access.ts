import { redirect } from 'next/navigation'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getSession } from '@/lib/session'
import { isAdminRole } from './roles'

export interface AdminSession {
  userId: string
  email: string
}

type AdminHref = '/sign-in' | '/panel/overview'

// Same reason as therapy/panel-access.ts: next-intl's redirect is a destructured binding, so
// TypeScript does not narrow on its never return. Routing through getPathname keeps the prefix.
function leave(href: AdminHref, locale: Locale): never {
  redirect(getPathname({ href, locale }))
}

/** Null for a signed out visitor, a reader, or a session borrowed through impersonation. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getSession()
  if (!session || !isAdminRole(session.user.role)) return null
  // A session minted by impersonation belongs to the account being read, not to the admin reading
  // it, so it never carries admin rights back into the admin area.
  if (session.session.impersonatedBy) return null

  return { userId: session.user.id, email: session.user.email }
}

export async function requireAdmin(locale: Locale): Promise<AdminSession> {
  const session = await getSession()
  if (!session) leave('/sign-in', locale)

  const admin = await getAdminSession()
  if (!admin) leave('/panel/overview', locale)

  return admin
}
