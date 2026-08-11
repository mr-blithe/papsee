export const IP_BAN_ERROR_CODE = 'IP_BANNED'

const AUTH_ENTRY_PATHS = new Set([
  '/sign-in/email',
  '/sign-up/email',
  '/sign-in/social',
  '/two-factor/verify-otp',
  '/two-factor/verify-backup-code',
  '/two-factor/verify-totp',
  '/request-password-reset',
])

// Better Call hands the middleware the request pathname rather than the route pattern, so the
// provider name is already in place here and /callback/:id never appears literally.
const OAUTH_CALLBACK_PREFIX = '/callback/'

/** The paths through which a banned address could get into, or back into, an account. */
export function isAuthEntryPath(path: string): boolean {
  return AUTH_ENTRY_PATHS.has(path) || path.startsWith(OAUTH_CALLBACK_PREFIX)
}
