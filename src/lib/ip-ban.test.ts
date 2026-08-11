import { describe, expect, it } from 'vitest'
import { isAuthEntryPath } from './ip-ban'

describe('isAuthEntryPath', () => {
  // Every one of these either mints a session or opens an account, so an address left out of the
  // list is an address that is banned in name only.
  it('guards every path a banned address could get into an account through', () => {
    for (const path of [
      '/sign-in/email',
      '/sign-up/email',
      '/sign-in/social',
      '/two-factor/verify-otp',
      '/two-factor/verify-backup-code',
      '/two-factor/verify-totp',
      '/request-password-reset',
    ]) {
      expect(isAuthEntryPath(path), path).toBe(true)
    }
  })

  // The router hands over the request pathname rather than the route pattern, so the provider name
  // is already substituted by the time this runs.
  it('guards the social callback, which is where the session is actually minted', () => {
    expect(isAuthEntryPath('/callback/google')).toBe(true)
  })

  it('leaves the paths a signed in reader uses alone', () => {
    for (const path of ['/get-session', '/sign-out', '/ok', '/list-sessions', '/update-user', '/two-factor/send-otp']) {
      expect(isAuthEntryPath(path), path).toBe(false)
    }
  })

  // Matching on a prefix would let a path that merely starts the same way through, and would also
  // catch paths nobody meant to guard.
  it('matches a guarded path exactly rather than by prefix', () => {
    for (const path of ['/sign-in/emailx', '/sign-in', '/sign-up/email/confirm', '/callback', '/two-factor']) {
      expect(isAuthEntryPath(path), path).toBe(false)
    }
  })
})
