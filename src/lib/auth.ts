import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware, getIp } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { admin, captcha, twoFactor } from 'better-auth/plugins'
import { defaultAc, userAc } from 'better-auth/plugins/admin/access'
import { CONFIRMATION_ERROR_CODE, CONFIRMATION_HEADER } from '@/lib/account-confirmation'
import { consumeAccountConfirmation } from '@/lib/account-confirmation.server'
import { sendSignInCodeMail, sendVerificationMail } from '@/lib/auth-mail.server'
import { SIGN_IN_CODE_EXPIRY_MINUTES, VERIFICATION_LINK_EXPIRY_MINUTES } from '@/lib/auth-mail'
import { isIpBanned } from '@/lib/admin/repository'
import { db } from '@/lib/db'
import { IP_BAN_ERROR_CODE, isAuthEntryPath } from '@/lib/ip-ban'
import { LEGAL_ACCEPTANCE_ERROR_CODE, hasLegalAcceptance, requiresLegalAcceptance } from '@/lib/legal-acceptance'
import { parseSmtpEnvironment } from '@/lib/mail'
import { enrolTwoFactor } from '@/lib/two-factor-enrolment'
import { deleteExpiredVerifications } from '@/lib/verification-cleanup'

const SIGN_UP_ENDPOINT = '/sign-up/email'
const SIGN_UP_CHALLENGE_ACTION = 'sign-up'
const SECONDS_PER_MINUTE = 60
const SIGN_IN_CODE_ATTEMPTS = 5
const SIGN_IN_CHALLENGE_SECONDS = 15 * SECONDS_PER_MINUTE
const IMPERSONATION_SECONDS = 15 * SECONDS_PER_MINUTE

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

const google =
  googleClientId && googleClientSecret
    ? { clientId: googleClientId, clientSecret: googleClientSecret, disableImplicitSignUp: true }
    : undefined

export const isGoogleEnabled = google !== undefined

const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY?.trim()
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()

const turnstile =
  turnstileSecretKey && turnstileSiteKey ? { secretKey: turnstileSecretKey, siteKey: turnstileSiteKey } : undefined

export const signUpChallenge = turnstile ? { siteKey: turnstile.siteKey, action: SIGN_UP_CHALLENGE_ACTION } : null

const isAccountMailEnabled = parseSmtpEnvironment(process.env) !== null

const adminPermissions = defaultAc.newRole({
  user: ['ban', 'impersonate', 'delete'],
  session: ['revoke'],
})

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', transaction: true }),
  emailAndPassword: { enabled: true, requireEmailVerification: isAccountMailEnabled },
  emailVerification: isAccountMailEnabled
    ? {
        sendVerificationEmail: ({ user, url }, request) => sendVerificationMail(user.email, url, request?.headers),
        sendOnSignIn: true,
        autoSignInAfterVerification: false,
        expiresIn: VERIFICATION_LINK_EXPIRY_MINUTES * SECONDS_PER_MINUTE,
        afterEmailVerification: (user) => enrolTwoFactor(user.id),
      }
    : undefined,
  socialProviders: google ? { google } : {},
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user, request) => {
        const code = request?.headers.get(CONFIRMATION_HEADER) ?? null
        if (await consumeAccountConfirmation(user.id, 'deleteAccount', code)) return

        throw APIError.from('FORBIDDEN', {
          code: CONFIRMATION_ERROR_CODE,
          message: CONFIRMATION_ERROR_CODE,
        })
      },
    },
  },
  databaseHooks: {
    verification: {
      create: {
        after: async (_row, context) => {
          try {
            await deleteExpiredVerifications()
          } catch (error) {
            context?.context.logger.error('Failed to sweep expired verification rows', error)
          }
        },
      },
    },
    ...(isAccountMailEnabled
      ? {
          user: {
            create: {
              before: async (user) => ({ data: { ...user, twoFactorEnabled: true } }),
              after: async (user, context) => {
                try {
                  await enrolTwoFactor(user.id)
                } catch (error) {
                  context?.context.logger.error('Failed to arm two factor for a new account', error)
                }
              },
            },
          },
        }
      : {}),
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      // Ahead of the legal check, so a banned address is not told which header it forgot.
      if (isAuthEntryPath(context.path) && context.headers) {
        const ip = getIp(context.headers, context.context.options)
        if (ip && (await isIpBanned(ip))) {
          throw APIError.from('FORBIDDEN', { code: IP_BAN_ERROR_CODE, message: IP_BAN_ERROR_CODE })
        }
      }

      const requestSignUp =
        typeof context.body === 'object' &&
        context.body !== null &&
        'requestSignUp' in context.body &&
        context.body.requestSignUp === true

      if (!requiresLegalAcceptance(context.path, requestSignUp)) return
      if (hasLegalAcceptance(context.headers)) return

      throw APIError.from('BAD_REQUEST', {
        code: LEGAL_ACCEPTANCE_ERROR_CODE,
        message: LEGAL_ACCEPTANCE_ERROR_CODE,
      })
    }),
  },
  plugins: [
    // First on purpose. TypeScript keeps this array a tuple only while its leading entries are
    // fixed, and a spread in front of a plugin erases the field types its schema adds, so role and
    // impersonatedBy would vanish from the inferred session.
    admin({
      // Least privilege, and the list is the feature set rather than a copy of the library's own
      // adminAc. Everything absent from it answers 403 to every caller, admins included: set-role,
      // create-user, update-user, set-password, set-email, list-users, get-user, list-user-sessions
      // and impersonate-admins. Promotion is pnpm db:promote-admin and nothing else. The reads all
      // go through src/lib/admin/repository.ts, so the panel never needs the plugin's list or get.
      // hasPermission reads `roles` alone; the plugin never looks at an `ac` option server side.
      roles: { admin: adminPermissions, user: userAc },
      impersonationSessionDuration: IMPERSONATION_SECONDS,
    }),
    ...(turnstile
      ? [
          captcha({
            provider: 'cloudflare-turnstile',
            secretKey: turnstile.secretKey,
            endpoints: [SIGN_UP_ENDPOINT],
            expectedAction: SIGN_UP_CHALLENGE_ACTION,
          }),
        ]
      : []),
    ...(isAccountMailEnabled
      ? [
          twoFactor({
            totpOptions: { disable: true },
            backupCodeOptions: { storeBackupCodes: 'plain' },
            otpOptions: {
              sendOTP: ({ user, otp }, context) => sendSignInCodeMail(user.email, otp, context?.headers),
              storeOTP: 'hashed',
              period: SIGN_IN_CODE_EXPIRY_MINUTES,
              allowedAttempts: SIGN_IN_CODE_ATTEMPTS,
            },
            twoFactorCookieMaxAge: SIGN_IN_CHALLENGE_SECONDS,
          }),
        ]
      : []),
    nextCookies(),
  ],
})
