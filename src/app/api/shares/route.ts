import { apiError } from '@/lib/api'
import { getPanelContext, readOnlyErrorCode } from '@/lib/panel-context'
import { createShare, deleteExpiredShares, listActiveShares } from '@/lib/therapy/repository'
import { createShareToken, hashShareToken } from '@/lib/therapy/share-token.server'
import { MAX_ACTIVE_SHARES, parseShareDuration, shareExpiry } from '@/lib/therapy/shares'

export async function POST(request: Request) {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')
  if (context.view !== 'account') return apiError(readOnlyErrorCode(context.view))

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('invalidRequest')
  }

  const minutes = parseShareDuration((body as { minutes?: unknown } | null)?.minutes)
  if (minutes === null) return apiError('invalidRequest')

  const now = new Date()
  await deleteExpiredShares(context.userId, now)

  if ((await listActiveShares(context.userId)).length >= MAX_ACTIVE_SHARES) return apiError('tooManyShares')

  const token = createShareToken()
  const id = await createShare(context.userId, hashShareToken(token), shareExpiry(minutes, now.getTime()))

  // The only time the token is ever readable. Nothing but its hash is stored.
  return Response.json({ id, token }, { status: 201 })
}
