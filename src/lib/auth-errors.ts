import { CONFIRMATION_ERROR_CODE } from '@/lib/account-confirmation'
import { LEGAL_ACCEPTANCE_ERROR_CODE } from '@/lib/legal-acceptance'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

const MESSAGE_KEY_BY_CODE = {
  INVALID_EMAIL_OR_PASSWORD: 'errorInvalidCredentials',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'errorEmailTaken',
  INVALID_EMAIL: 'errorInvalidEmail',
  PASSWORD_TOO_SHORT: 'errorPasswordTooShort',
  PASSWORD_TOO_LONG: 'errorPasswordTooLong',
  MISSING_RESPONSE: 'errorChallengeIncomplete',
  VERIFICATION_FAILED: 'errorChallengeFailed',
  INVALID_PASSWORD: 'errorInvalidPassword',
  SESSION_EXPIRED: 'errorSessionNotFresh',
  [LEGAL_ACCEPTANCE_ERROR_CODE]: 'errorLegalAcceptanceRequired',
  EMAIL_NOT_VERIFIED: 'errorEmailNotVerified',
  // The confirmation link is checked by a redirect handler, so these three come back on the query
  // string of the page it was pointed at rather than as a client side error.
  TOKEN_EXPIRED: 'errorLinkExpired',
  INVALID_TOKEN: 'errorLinkInvalid',
  USER_NOT_FOUND: 'errorAccountNotFound',
  INVALID_CODE: 'errorCodeInvalid',
  OTP_HAS_EXPIRED: 'errorCodeExpired',
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'errorCodeAttempts',
  ACCOUNT_TEMPORARILY_LOCKED: 'errorAccountLocked',
  INVALID_TWO_FACTOR_COOKIE: 'errorChallengeExpired',
  [CONFIRMATION_ERROR_CODE]: 'errorConfirmationFailed',
  // Google refuses rather than creating an account behind the reader's back, so these two arrive as
  // a redirect back to the page the button was pressed on rather than as a client side error.
  signup_disabled: 'errorGoogleNoAccount',
  email_not_found: 'errorGoogleNoEmail',
} as const

export type AuthErrorMessageKey = (typeof MESSAGE_KEY_BY_CODE)[keyof typeof MESSAGE_KEY_BY_CODE] | 'errorUnknown'

export function authErrorKey(code: string | undefined): AuthErrorMessageKey {
  return (code && MESSAGE_KEY_BY_CODE[code as keyof typeof MESSAGE_KEY_BY_CODE]) || 'errorUnknown'
}
