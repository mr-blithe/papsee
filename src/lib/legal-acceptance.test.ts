import { describe, expect, it } from 'vitest'
import { authErrorKey } from './auth-errors'
import {
  LEGAL_ACCEPTANCE_ERROR_CODE,
  LEGAL_ACCEPTANCE_HEADER,
  LEGAL_ACCEPTANCE_VALUE,
  hasLegalAcceptance,
  requiresLegalAcceptance,
} from './legal-acceptance'

describe('legal acceptance', () => {
  it('requires acceptance for email and explicit social registration only', () => {
    expect(requiresLegalAcceptance('/sign-up/email')).toBe(true)
    expect(requiresLegalAcceptance('/sign-in/social', true)).toBe(true)
    expect(requiresLegalAcceptance('/sign-in/social', false)).toBe(false)
    expect(requiresLegalAcceptance('/sign-in/email')).toBe(false)
  })

  it('accepts only the explicit legal acceptance header value', () => {
    expect(
      hasLegalAcceptance(
        new Headers({
          [LEGAL_ACCEPTANCE_HEADER]: LEGAL_ACCEPTANCE_VALUE,
        }),
      ),
    ).toBe(true)
    expect(hasLegalAcceptance(undefined)).toBe(false)
    expect(hasLegalAcceptance(new Headers())).toBe(false)
    expect(hasLegalAcceptance(new Headers({ [LEGAL_ACCEPTANCE_HEADER]: 'false' }))).toBe(false)
  })

  it('maps a rejected registration to the legal acceptance message', () => {
    expect(authErrorKey(LEGAL_ACCEPTANCE_ERROR_CODE)).toBe('errorLegalAcceptanceRequired')
  })
})
