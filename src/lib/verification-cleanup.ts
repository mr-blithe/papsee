import { lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { verification } from '@/lib/db/schema'

export async function deleteExpiredVerifications(): Promise<void> {
  await db.delete(verification).where(lt(verification.expiresAt, new Date()))
}
