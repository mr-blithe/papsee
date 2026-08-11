import { createAuthClient } from 'better-auth/react'
import { adminClient, twoFactorClient } from 'better-auth/client/plugins'

export const { signIn, signUp, signOut, updateUser, deleteUser, sendVerificationEmail, twoFactor, admin } =
  createAuthClient({
    // One client rather than a second one scoped to the admin screens: adminClient refreshes the
    // session store after impersonating and after stopping, and the banner that stops lives in the
    // panel, so the panel needs this plugin either way.
    plugins: [twoFactorClient(), adminClient()],
  })
