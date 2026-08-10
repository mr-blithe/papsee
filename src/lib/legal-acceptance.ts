export const LEGAL_ACCEPTANCE_HEADER = 'x-legal-acceptance'
export const LEGAL_ACCEPTANCE_VALUE = 'accepted'
export const LEGAL_ACCEPTANCE_ERROR_CODE = 'LEGAL_ACCEPTANCE_REQUIRED'

const EMAIL_SIGN_UP_ENDPOINT = '/sign-up/email'
const SOCIAL_SIGN_IN_ENDPOINT = '/sign-in/social'

export function requiresLegalAcceptance(path: string, requestSignUp = false): boolean {
  return path === EMAIL_SIGN_UP_ENDPOINT || (path === SOCIAL_SIGN_IN_ENDPOINT && requestSignUp)
}

export function hasLegalAcceptance(headers: Headers | undefined): boolean {
  return headers?.get(LEGAL_ACCEPTANCE_HEADER) === LEGAL_ACCEPTANCE_VALUE
}
