import type { Mail } from '@/lib/mail'

export const VERIFICATION_LINK_EXPIRY_MINUTES = 15
export const SIGN_IN_CODE_EXPIRY_MINUTES = 5
export const SIGN_IN_CODE_LENGTH = 6

export interface AuthMailCopy {
  subject: string
  intro: string
  expiry: string
  ignore: string
}

export function buildAuthMail(to: string, detail: string, copy: AuthMailCopy): Mail {
  return {
    to,
    subject: copy.subject,
    text: [copy.intro, '', detail, '', copy.expiry, copy.ignore].join('\n'),
  }
}
