import { cache } from 'react'
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { account } from '@/lib/db/schema'

const CREDENTIAL_PROVIDER = 'credential'

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }))

export async function credentialPasswordHash(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER)))
    .limit(1)

  return row?.password ?? null
}

export async function hasPasswordAccount(userId: string): Promise<boolean> {
  return (await credentialPasswordHash(userId)) !== null
}

export async function requireSignedOut(locale: Locale): Promise<void> {
  if (await getSession()) redirect({ href: '/panel', locale })
}
