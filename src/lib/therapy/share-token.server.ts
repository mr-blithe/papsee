import { createHash, randomBytes } from 'node:crypto'

const SHARE_TOKEN_BYTES = 32

export function createShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString('base64url')
}

/**
 * Only the hash is stored, so a copy of the table hands nobody a working link. A single SHA-256 is
 * enough where bcrypt would not be: the token is 256 bits from a CSPRNG, so there is no guessing to
 * slow down.
 */
export function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
