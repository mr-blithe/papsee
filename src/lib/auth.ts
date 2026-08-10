import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { captcha, twoFactor } from 'better-auth/plugins'
import { sendSignInCodeMail, sendVerificationMail } from '@/lib/auth-mail.server'
import { SIGN_IN_CODE_EXPIRY_MINUTES, VERIFICATION_LINK_EXPIRY_MINUTES } from '@/lib/auth-mail'
import { db } from '@/lib/db'
import { LEGAL_ACCEPTANCE_ERROR_CODE, hasLegalAcceptance, requiresLegalAcceptance } from '@/lib/legal-acceptance'
import { parseSmtpEnvironment } from '@/lib/mail'
import { enrolTwoFactor } from '@/lib/two-factor-enrolment'

const SIGN_UP_ENDPOINT = '/sign-up/email'
const SIGN_UP_CHALLENGE_ACTION = 'sign-up'
const SECONDS_PER_MINUTE = 60
const SIGN_IN_CODE_ATTEMPTS = 5
// The challenge outlives the code on purpose, so asking for a fresh one late in the window still works.
const SIGN_IN_CHALLENGE_SECONDS = 15 * SECONDS_PER_MINUTE

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

// Confirming an address and emailing a sign-in code both need a mailbox to send from, so SMTP is what
// decides whether either exists. Half a configuration leaves the account guarded the way it is today
// rather than leaving a self hosted instance unable to register anyone, the same trade Turnstile makes.
const isAccountMailEnabled = parseSmtpEnvironment(process.env) !== null

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', transaction: true }),
  emailAndPassword: { enabled: true, requireEmailVerification: isAccountMailEnabled },
  emailVerification: isAccountMailEnabled
    ? {
        sendVerificationEmail: ({ user, url }, request) => sendVerificationMail(user.email, url, request?.headers),
        // A blocked sign-in re-sends the link, so a reader who lost the first one only has to try again.
        sendOnSignIn: true,
        // The link proves the address, nothing more. Signing in is a separate step, and it is the step
        // the new-browser code hangs off, so a forwarded link never becomes a session.
        autoSignInAfterVerification: false,
        expiresIn: VERIFICATION_LINK_EXPIRY_MINUTES * SECONDS_PER_MINUTE,
        // The second chance at arming the account, and the last one before a first sign-in could
        // need it. Signing in is impossible until this has run.
        afterEmailVerification: (user) => enrolTwoFactor(user.id),
      }
    : undefined,
  socialProviders: google ? { google } : {},
  // Deleting the user cascades to every table that references it, which is what the GDPR and KVKK
  // erasure paths need. Better Auth asks for a password, or a session younger than freshAge.
  user: { deleteUser: { enabled: true } },
  databaseHooks: isAccountMailEnabled
    ? {
        user: {
          create: {
            // `twoFactorEnabled` is not settable through the request body, and `/two-factor/enable`
            // wants a live session and the password, neither of which exists at sign up. A database
            // hook is the one seam left, so every account is armed the moment it is created.
            before: async (user) => ({ data: { ...user, twoFactorEnabled: true } }),
            // Better Auth awaits this after the user commits but before the credential account is
            // linked, and does not catch it, so letting it throw would leave an account nobody can
            // ever sign in to. Losing the row here is recoverable; losing the password is not.
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
    : undefined,
  hooks: {
    before: createAuthMiddleware(async (context) => {
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
            // PapSee asks for a code because the browser is new, not because the reader set up an
            // authenticator, so there is no TOTP step and no backup codes to hand out. Backup codes
            // stay unencoded because the seeded row holds an empty list, and an encrypted empty
            // string is what makes /two-factor/verify-backup-code fail with a 500 instead of a
            // refusal.
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
