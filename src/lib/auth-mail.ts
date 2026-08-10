import type { Mail } from '@/lib/mail'

export const VERIFICATION_LINK_EXPIRY_MINUTES = 60
export const SIGN_IN_CODE_EXPIRY_MINUTES = 5
// Better Auth's own default, restated here because the code screen has to draw one slot per digit.
export const SIGN_IN_CODE_LENGTH = 6

export interface AuthMailCopy {
  subject: string
  intro: string
  expiry: string
  ignore: string
}

/**
 * `detail` is the one line the reader has to act on, the confirmation link or the code, so it sits
 * alone between blank lines rather than inside a sentence a mail client might wrap or linkify.
 */
export function buildAuthMail(to: string, detail: string, copy: AuthMailCopy): Mail {
  return {
    to,
    subject: copy.subject,
    text: [copy.intro, '', detail, '', copy.expiry, copy.ignore].join('\n'),
  }
}
