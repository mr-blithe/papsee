import { getTranslations } from 'next-intl/server'
import { CONFIRMATION_EXPIRY_MINUTES, type AccountAction } from '@/lib/account-confirmation'
import { authMailLocale } from '@/lib/auth-locale'
import { SIGN_IN_CODE_EXPIRY_MINUTES, VERIFICATION_LINK_EXPIRY_MINUTES, buildAuthMail } from '@/lib/auth-mail'
import { sendMail } from '@/lib/mail.server'

function authMailCopy(headers: Headers | undefined) {
  return getTranslations({ locale: authMailLocale(headers), namespace: 'AuthMail' })
}

export async function sendVerificationMail(to: string, url: string, headers: Headers | undefined): Promise<void> {
  const t = await authMailCopy(headers)

  await sendMail(
    buildAuthMail(to, url, {
      subject: t('verifySubject'),
      intro: t('verifyIntro'),
      expiry: t('verifyExpiry', { minutes: VERIFICATION_LINK_EXPIRY_MINUTES }),
      ignore: t('verifyIgnore'),
    }),
  )
}

export async function sendSignInCodeMail(to: string, code: string, headers: Headers | undefined): Promise<void> {
  const t = await authMailCopy(headers)

  await sendMail(
    buildAuthMail(to, t('codeValue', { code }), {
      subject: t('codeSubject'),
      intro: t('codeIntro'),
      expiry: t('codeExpiry', { minutes: SIGN_IN_CODE_EXPIRY_MINUTES }),
      ignore: t('codeIgnore'),
    }),
  )
}

export async function sendAccountConfirmationMail(
  to: string,
  action: AccountAction,
  code: string,
  headers: Headers | undefined,
): Promise<void> {
  const t = await authMailCopy(headers)

  await sendMail(
    buildAuthMail(to, t('confirmValue', { code }), {
      subject: action === 'deleteAccount' ? t('confirmAccountSubject') : t('confirmDataSubject'),
      intro: action === 'deleteAccount' ? t('confirmAccountIntro') : t('confirmDataIntro'),
      expiry: t('confirmExpiry', { minutes: CONFIRMATION_EXPIRY_MINUTES }),
      ignore: t('confirmIgnore'),
    }),
  )
}
