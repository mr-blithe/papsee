import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/client/plugins'

// The plugin's own redirect options do a full page load, which would drop the locale prefix and the
// router cache. The sign in form reads `twoFactorRedirect` off the response and navigates itself.
export const { signIn, signUp, signOut, updateUser, deleteUser, twoFactor } = createAuthClient({
  plugins: [twoFactorClient()],
})
