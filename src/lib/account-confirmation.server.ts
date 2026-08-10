import { createHash, randomInt } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import {
  CONFIRMATION_CODE_LENGTH,
  CONFIRMATION_EXPIRY_MINUTES,
  confirmationVerdict,
  type AccountAction,
} from '@/lib/account-confirmation'
import { db } from '@/lib/db'
import { verification } from '@/lib/db/schema'

const MILLISECONDS_PER_MINUTE = 60_000

function identifierFor(userId: string, action: AccountAction): string {
  return `account-confirmation:${action}:${userId}`
}

function digest(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export async function requestAccountConfirmation(userId: string, action: AccountAction): Promise<string> {
  const identifier = identifierFor(userId, action)
  const code = randomInt(0, 10 ** CONFIRMATION_CODE_LENGTH)
    .toString()
    .padStart(CONFIRMATION_CODE_LENGTH, '0')

  await db.delete(verification).where(eq(verification.identifier, identifier))
  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier,
    value: `${digest(code)}:0`,
    expiresAt: new Date(Date.now() + CONFIRMATION_EXPIRY_MINUTES * MILLISECONDS_PER_MINUTE),
  })

  return code
}

export async function consumeAccountConfirmation(
  userId: string,
  action: AccountAction,
  code: string | null,
): Promise<boolean> {
  if (!code) return false

  const identifier = identifierFor(userId, action)
  const [outstanding] = await db
    .select({ id: verification.id, value: verification.value, expiresAt: verification.expiresAt })
    .from(verification)
    .where(eq(verification.identifier, identifier))
    .limit(1)

  if (!outstanding) return false

  const { verdict, attempts } = confirmationVerdict(outstanding, digest(code), new Date())

  if (verdict === 'spent') {
    await db.delete(verification).where(eq(verification.id, outstanding.id))
    return false
  }

  if (verdict === 'wrong') {
    const [expected] = outstanding.value.split(':')
    await db
      .update(verification)
      .set({ value: `${expected}:${attempts + 1}` })
      .where(and(eq(verification.id, outstanding.id), eq(verification.value, outstanding.value)))

    return false
  }

  await db.delete(verification).where(eq(verification.id, outstanding.id))

  return true
}
