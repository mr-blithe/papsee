// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { TurnstileUnavailableError, verifyContactChallenge } from './turnstile.server'

function response(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

describe('contact challenge verification', () => {
  it('accepts only a successful token issued for the contact action', async () => {
    const request = vi.fn(async () => response({ success: true, action: 'contact' }))

    await expect(verifyContactChallenge('visitor-token', 'secret-key', request)).resolves.toBe(true)
    expect(request).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret: 'secret-key', response: 'visitor-token' }),
      }),
    )
  })

  it('rejects failed tokens and tokens issued for another action', async () => {
    await expect(
      verifyContactChallenge('visitor-token', 'secret-key', async () => response({ success: false })),
    ).resolves.toBe(false)
    await expect(
      verifyContactChallenge('visitor-token', 'secret-key', async () => response({ success: true, action: 'sign-up' })),
    ).resolves.toBe(false)
  })

  it('reports an unavailable verifier separately from a visitor who failed the challenge', async () => {
    await expect(
      verifyContactChallenge('visitor-token', 'secret-key', async () => response({}, 503)),
    ).rejects.toBeInstanceOf(TurnstileUnavailableError)
  })
})
