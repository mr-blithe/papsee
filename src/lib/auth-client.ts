import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/client/plugins'

export const { signIn, signUp, signOut, updateUser, deleteUser, sendVerificationEmail, twoFactor } = createAuthClient({
  plugins: [twoFactorClient()],
})
