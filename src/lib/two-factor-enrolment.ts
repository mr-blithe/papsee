import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { twoFactor } from '@/lib/db/schema'

// Better Auth has no mandatory two factor mode, and `/two-factor/verify-otp` refuses a sign-in for an
// account with no row in this table, so PapSee writes one itself for every account. The row is also
// where the failed verification budget and the lockout live. PapSee offers neither an authenticator
// app nor backup codes, so there is no secret to store and the code list is empty.
const NO_TOTP_SECRET = ''
const NO_BACKUP_CODES = '[]'

/**
 * Idempotent because it runs twice: once when the account is created, and again when the address is
 * confirmed, which is the last moment before a first sign-in could need the row.
 */
export async function enrolTwoFactor(userId: string): Promise<void> {
  const [enrolled] = await db.select({ id: twoFactor.id }).from(twoFactor).where(eq(twoFactor.userId, userId)).limit(1)
  if (enrolled) return

  await db.insert(twoFactor).values({
    id: crypto.randomUUID(),
    userId,
    secret: NO_TOTP_SECRET,
    backupCodes: NO_BACKUP_CODES,
  })
}
