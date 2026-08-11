// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()

vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/session', () => ({ getSession: () => getSession() }))

const { getAdminSession } = await import('./access')
const { isAdminRole } = await import('./roles')

function signedInAs(role: string | null, impersonatedBy: string | null = null) {
  return {
    user: { id: 'user-1', email: 'reader@example.com', role },
    session: { id: 'session-1', impersonatedBy },
  }
}

beforeEach(() => {
  getSession.mockReset()
  getSession.mockResolvedValue(null)
})

describe('isAdminRole', () => {
  it('accepts a role stored as a comma joined list, which is what setRole with an array writes', () => {
    expect(isAdminRole('admin,user')).toBe(true)
    expect(isAdminRole('user,admin')).toBe(true)
    expect(isAdminRole('user, admin')).toBe(true)
  })

  it('refuses a role that merely contains the word', () => {
    for (const role of ['administrator', 'superadmin', 'not-admin', 'admins', 'Admin']) {
      expect(isAdminRole(role), role).toBe(false)
    }
  })

  it('refuses the roles a reader actually carries', () => {
    expect(isAdminRole('user')).toBe(false)
    expect(isAdminRole('')).toBe(false)
    expect(isAdminRole(null)).toBe(false)
    expect(isAdminRole(undefined)).toBe(false)
  })
})

describe('getAdminSession', () => {
  it('names the admin behind an admin session', async () => {
    getSession.mockResolvedValue(signedInAs('admin'))

    expect(await getAdminSession()).toEqual({ userId: 'user-1', email: 'reader@example.com' })
  })

  it('refuses a signed out visitor', async () => {
    expect(await getAdminSession()).toBe(null)
  })

  it('refuses a signed in reader, who would otherwise open every admin page and route', async () => {
    for (const role of ['user', null]) {
      getSession.mockResolvedValue(signedInAs(role))

      expect(await getAdminSession(), String(role)).toBe(null)
    }
  })

  // An admin who is impersonating is holding a session minted for somebody else. Admin powers are
  // never exercised through one, whatever role it reports.
  it('refuses an impersonating session that reports the admin role', async () => {
    getSession.mockResolvedValue(signedInAs('admin', 'admin-1'))

    expect(await getAdminSession()).toBe(null)
  })
})
