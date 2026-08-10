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
} as const

export type AuthErrorMessageKey = (typeof MESSAGE_KEY_BY_CODE)[keyof typeof MESSAGE_KEY_BY_CODE] | 'errorUnknown'

export function authErrorKey(code: string | undefined): AuthErrorMessageKey {
  return (code && MESSAGE_KEY_BY_CODE[code as keyof typeof MESSAGE_KEY_BY_CODE]) || 'errorUnknown'
}
