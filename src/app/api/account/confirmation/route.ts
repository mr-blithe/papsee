import { isAccountAction } from '@/lib/account-confirmation'
import { requestAccountConfirmation } from '@/lib/account-confirmation.server'
import { apiError } from '@/lib/api'
import { auth } from '@/lib/auth'
import { sendAccountConfirmationMail } from '@/lib/auth-mail.server'
import { getPanelContext, readOnlyErrorCode } from '@/lib/panel-context'
import { credentialPasswordHash } from '@/lib/session'

export const runtime = 'nodejs'

const CONFIRMATION_REQUEST_MAX_BYTES = 4 * 1024

export async function POST(request: Request) {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')
  if (context.view !== 'account') return apiError(readOnlyErrorCode(context.view))

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > CONFIRMATION_REQUEST_MAX_BYTES) return apiError('invalidRequest')

  let body: unknown
  try {
    body = JSON.parse(text) as unknown
  } catch {
    return apiError('invalidRequest')
  }

  const { action, password } = (body ?? {}) as { action?: unknown; password?: unknown }
  if (!isAccountAction(action)) return apiError('invalidRequest')

  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return apiError('unauthorized')

  const hash = await credentialPasswordHash(context.userId)
  if (hash) {
    if (typeof password !== 'string' || password.length === 0) return apiError('invalidPassword')

    const { password: passwords } = await auth.$context
    if (!(await passwords.verify({ password, hash }))) return apiError('invalidPassword')
  }

  const code = await requestAccountConfirmation(context.userId, action)
  await sendAccountConfirmationMail(session.user.email, action, code, request.headers)

  return new Response(null, { status: 204 })
}
