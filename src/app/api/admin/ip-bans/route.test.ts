// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminSession } from '@/lib/admin/access'

const getAdminSession = vi.fn<() => Promise<AdminSession | null>>()
const banIp = vi.fn()
const listBannedIps = vi.fn()
const unbanIp = vi.fn()

vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/auth', () => ({ auth: { options: {} } }))

vi.mock('@/lib/admin/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/access')>()),
  getAdminSession: () => getAdminSession(),
}))

vi.mock('@/lib/admin/repository', () => ({
  banIp: (ip: string, reason: string | null, bannedBy: string) => banIp(ip, reason, bannedBy),
  listBannedIps: () => listBannedIps(),
  unbanIp: (id: string) => unbanIp(id),
}))

const { GET, POST } = await import('./route')
const { DELETE } = await import('./[id]/route')

const ADMIN: AdminSession = { userId: 'admin-1', email: 'admin@papsee.test' }
const CALLER_IP = '203.0.113.7'
const BAN_ID = '4f6d1c02-9a3e-4c11-8f7b-2d5e0a91c3b4'

function post(body: unknown, callerIp = CALLER_IP) {
  return new Request('http://localhost/api/admin/ip-bans', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': callerIp },
    body: JSON.stringify(body),
  })
}

function remove(id: string) {
  return {
    request: new Request(`http://localhost/api/admin/ip-bans/${id}`, { method: 'DELETE' }),
    context: { params: Promise.resolve({ id }) },
  }
}

async function errorCode(response: Response): Promise<string | undefined> {
  return ((await response.json()) as { error?: string }).error
}

beforeEach(() => {
  getAdminSession.mockReset()
  banIp.mockReset()
  listBannedIps.mockReset()
  unbanIp.mockReset()
  getAdminSession.mockResolvedValue(ADMIN)
  banIp.mockResolvedValue({ id: BAN_ID, revokedSessions: 0 })
  listBannedIps.mockResolvedValue([])
  unbanIp.mockResolvedValue(true)
})

// The admin area has no read API, so these two routes are the whole surface a signed in reader
// could reach. If either answered them, anyone with an account could ban addresses.
describe('a caller who is not an admin', () => {
  beforeEach(() => {
    getAdminSession.mockResolvedValue(null)
  })

  it('is refused on every method, and reaches no query', async () => {
    const list = await GET()
    expect(list.status).toBe(403)
    expect(await errorCode(list)).toBe('forbidden')

    const created = await POST(post({ ip: '198.51.100.4' }))
    expect(created.status).toBe(403)
    expect(await errorCode(created)).toBe('forbidden')

    const { request, context } = remove(BAN_ID)
    const deleted = await DELETE(request, context)
    expect(deleted.status).toBe(403)
    expect(await errorCode(deleted)).toBe('forbidden')

    expect(listBannedIps).not.toHaveBeenCalled()
    expect(banIp).not.toHaveBeenCalled()
    expect(unbanIp).not.toHaveBeenCalled()
  })
})

describe('banning an address', () => {
  // The whole instance runs behind one admin panel. Banning the address the admin is sitting on
  // would take the last way back in with it.
  it('refuses the address the request itself came from', async () => {
    const response = await POST(post({ ip: CALLER_IP }))

    expect(response.status).toBe(409)
    expect(await errorCode(response)).toBe('cannotBanOwnIp')
    expect(banIp).not.toHaveBeenCalled()
  })

  // A stored address that getIp could never produce is a ban that silently matches nothing.
  it('refuses anything that is not an address', async () => {
    for (const ip of ['not-an-ip', '', '999.1.1.1', '203.0.113.7/24', 'localhost', ' ']) {
      const response = await POST(post({ ip }))

      expect(response.status, JSON.stringify(ip)).toBe(400)
      expect(await errorCode(response), JSON.stringify(ip)).toBe('invalidRequest')
    }

    expect(banIp).not.toHaveBeenCalled()
  })

  it('refuses a body that is not an object at all', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/ip-bans', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': CALLER_IP },
        body: 'not json',
      }),
    )

    expect(response.status).toBe(400)
    expect(await errorCode(response)).toBe('invalidRequest')
  })

  // Refusing the next sign in is only half a ban, so the count of sessions it killed is reported
  // back rather than swallowed.
  it('reports how many sessions the ban signed out', async () => {
    banIp.mockResolvedValue({ id: BAN_ID, revokedSessions: 3 })

    const response = await POST(post({ ip: '198.51.100.4', reason: 'repeated abuse' }))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ id: BAN_ID, revokedSessions: 3 })
  })

  it('accepts an IPv6 address', async () => {
    const response = await POST(post({ ip: '2001:db8::1' }))

    expect(response.status).toBe(201)
  })
})

describe('lifting a ban', () => {
  it('refuses an id that is not one', async () => {
    const { request, context } = remove('nope')
    const response = await DELETE(request, context)

    expect(response.status).toBe(404)
    expect(await errorCode(response)).toBe('notFound')
    expect(unbanIp).not.toHaveBeenCalled()
  })

  it('reports a ban that was already lifted rather than pretending it removed one', async () => {
    unbanIp.mockResolvedValue(false)

    const { request, context } = remove(BAN_ID)
    const response = await DELETE(request, context)

    expect(response.status).toBe(404)
    expect(await errorCode(response)).toBe('notFound')
  })

  it('answers with no content once the ban is gone', async () => {
    const { request, context } = remove(BAN_ID)
    const response = await DELETE(request, context)

    expect(response.status).toBe(204)
  })
})
