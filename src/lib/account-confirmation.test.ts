import { describe, expect, it } from 'vitest'
import { CONFIRMATION_ATTEMPTS, confirmationVerdict, isAccountAction } from './account-confirmation'

const CODE = 'a'.repeat(64)
const OTHER = 'b'.repeat(64)
const NOW = new Date('2026-08-10T12:00:00.000Z')
const LATER = new Date('2026-08-10T12:05:00.000Z')

describe('isAccountAction', () => {
  it('accepts only the two destructive actions, so a request cannot name its own', () => {
    expect(isAccountAction('deleteData')).toBe(true)
    expect(isAccountAction('deleteAccount')).toBe(true)
    expect(isAccountAction('deleteSomeoneElse')).toBe(false)
    expect(isAccountAction(undefined)).toBe(false)
  })
})

describe('confirmationVerdict', () => {
  it('accepts the code it was issued for', () => {
    expect(confirmationVerdict({ value: `${CODE}:0`, expiresAt: LATER }, CODE, NOW)).toEqual({
      verdict: 'accepted',
      attempts: 0,
    })
  })

  it('refuses a different code and reports the count so the caller can charge for the guess', () => {
    expect(confirmationVerdict({ value: `${CODE}:2`, expiresAt: LATER }, OTHER, NOW)).toEqual({
      verdict: 'wrong',
      attempts: 2,
    })
  })

  it('burns the code once the budget is spent, even when the guess is finally right', () => {
    expect(
      confirmationVerdict({ value: `${CODE}:${CONFIRMATION_ATTEMPTS}`, expiresAt: LATER }, CODE, NOW).verdict,
    ).toBe('spent')
  })

  it('still allows the last attempt in the budget rather than stopping one short', () => {
    expect(
      confirmationVerdict({ value: `${CODE}:${CONFIRMATION_ATTEMPTS - 1}`, expiresAt: LATER }, CODE, NOW).verdict,
    ).toBe('accepted')
  })

  it('refuses a correct code that has expired', () => {
    expect(confirmationVerdict({ value: `${CODE}:0`, expiresAt: NOW }, CODE, LATER).verdict).toBe('spent')
  })

  it('treats a malformed counter as no attempts rather than crashing the delete path', () => {
    expect(confirmationVerdict({ value: CODE, expiresAt: LATER }, CODE, NOW)).toEqual({
      verdict: 'accepted',
      attempts: 0,
    })
  })
})
