import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { twoFactor } from '@/lib/db/schema'

const NO_TOTP_SECRET = ''
const NO_BACKUP_CODES = '[]'

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
