import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { captcha } from 'better-auth/plugins'
import { db } from '@/lib/db'
import { LEGAL_ACCEPTANCE_ERROR_CODE, hasLegalAcceptance, requiresLegalAcceptance } from '@/lib/legal-acceptance'

const SIGN_UP_ENDPOINT = '/sign-up/email'
const SIGN_UP_CHALLENGE_ACTION = 'sign-up'

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

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', transaction: true }),
  emailAndPassword: { enabled: true },
  socialProviders: google ? { google } : {},
  // Deleting the user cascades to every table that references it, which is what the GDPR and KVKK
  // erasure paths need. Better Auth asks for a password, or a session younger than freshAge.
  user: { deleteUser: { enabled: true } },
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
    nextCookies(),
  ],
})
