import { isIP } from 'node:net'
import { getIp } from 'better-auth/api'
import { getAdminSession } from '@/lib/admin/access'
import { banIp, listBannedIps } from '@/lib/admin/repository'
import { apiError } from '@/lib/api'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

const MAX_REASON_LENGTH = 200

/**
 * The stored address has to be the one a sign in will be measured against, so a typed address goes
 * through the same resolution better-auth uses when it writes session.ip_address. isIP runs first
 * because getIp answers with the loopback address in development rather than refusing.
 */
function canonicalIp(value: unknown): string | null {
  if (typeof value !== 'string' || isIP(value.trim()) === 0) return null

  return getIp(new Headers({ 'x-forwarded-for': value.trim() }), auth.options)
}

export async function GET() {
  if (!(await getAdminSession())) return apiError('forbidden')

  return Response.json({ bans: await listBannedIps() })
}

export async function POST(request: Request) {
  const admin = await getAdminSession()
  if (!admin) return apiError('forbidden')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('invalidRequest')
  }

  const input = body as { ip?: unknown; reason?: unknown } | null
  const ip = canonicalIp(input?.ip)
  if (!ip) return apiError('invalidRequest')

  if (ip === getIp(request.headers, auth.options)) return apiError('cannotBanOwnIp')

  const reason =
    typeof input?.reason === 'string' && input.reason.trim() ? input.reason.trim().slice(0, MAX_REASON_LENGTH) : null

  return Response.json(await banIp(ip, reason, admin.userId), { status: 201 })
}
