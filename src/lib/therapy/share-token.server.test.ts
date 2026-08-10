// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { createShareToken, hashShareToken } from './share-token.server'

const BASE64URL_ONLY = /^[A-Za-z0-9_-]+$/
const SHA256_HEX = /^[0-9a-f]{64}$/
const TOKENS_TO_COMPARE = 500

describe('share token', () => {
  // A token travels in a URL path, so a standard base64 alphabet would break the link on every
  // token that happens to contain a slash.
  it('is safe to put in a path', () => {
    expect(createShareToken()).toMatch(BASE64URL_ONLY)
  })

  it('carries the full 32 bytes of randomness', () => {
    expect(Buffer.from(createShareToken(), 'base64url')).toHaveLength(32)
  })

  it('never repeats itself', () => {
    const tokens = new Set(Array.from({ length: TOKENS_TO_COMPARE }, createShareToken))

    expect(tokens.size).toBe(TOKENS_TO_COMPARE)
  })
})

describe('share token hash', () => {
  it('answers the same for the same token, so a stored link can be found again', () => {
    const token = createShareToken()

    expect(hashShareToken(token)).toBe(hashShareToken(token))
    expect(hashShareToken(token)).toMatch(SHA256_HEX)
  })

  it('answers differently for a different token', () => {
    expect(hashShareToken(createShareToken())).not.toBe(hashShareToken(createShareToken()))
  })

  // What is stored has to be useless to whoever reads the table.
  it('never hands back the token it was given', () => {
    const token = createShareToken()

    expect(hashShareToken(token)).not.toContain(token)
  })
})
