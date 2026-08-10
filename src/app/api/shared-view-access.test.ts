// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PanelContext } from '@/lib/panel-context'

const getPanelContext = vi.fn<() => Promise<PanelContext | null>>()

vi.mock('@/lib/db', () => ({ db: {} }))

vi.mock('@/lib/panel-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/panel-context')>()),
  getPanelContext: () => getPanelContext(),
}))

vi.mock('@/lib/therapy/repository', () => ({
  getProfile: () => Promise.resolve({ bornOn: '1978-04-22', heightCm: 178, weightKg: 92 }),
  listDaysForExport: () => Promise.resolve([]),
  listImportsForExport: () => Promise.resolve([]),
  findShareByTokenHash: () => Promise.resolve(null),
}))

const { GET: readProfile } = await import('./profile/route')
const { GET: readExport } = await import('./export/route')

const OWNER_ID = 'user_owner'
const READER_ID = 'user_reader'

const SHARED: PanelContext = { view: 'shared', userId: OWNER_ID, expiresAt: new Date(Date.now() + 60_000) }
const ACCOUNT: PanelContext = { view: 'account', userId: READER_ID }
const DEMO: PanelContext = { view: 'demo', userId: null }

async function errorCode(response: Response): Promise<string | undefined> {
  return ((await response.json()) as { error?: string }).error
}

beforeEach(() => {
  getPanelContext.mockReset()
})

// The link was granted for the nights, so these two are not part of it. A silent empty answer would
// look like an account with nothing in it; a 403 with its own code says what happened.
describe('what a share link refuses', () => {
  it('refuses the profile, so a name, a birth date, a height and a weight stay with the owner', async () => {
    getPanelContext.mockResolvedValue(SHARED)

    const response = await readProfile()

    expect(response.status).toBe(403)
    expect(await errorCode(response)).toBe('notInSharedView')
  })

  it('refuses the export, so the whole history cannot be taken away as a file', async () => {
    getPanelContext.mockResolvedValue(SHARED)

    const response = await readExport(new Request('http://localhost/api/export?format=json&locale=en'))

    expect(response.status).toBe(403)
    expect(await errorCode(response)).toBe('notInSharedView')
  })
})

describe('what the same two routes still answer', () => {
  it('hands an account its own profile', async () => {
    getPanelContext.mockResolvedValue(ACCOUNT)

    const response = await readProfile()

    expect(response.status).toBe(200)
    expect((await response.json()).profile).toMatchObject({ heightCm: 178 })
  })

  it('hands the example patient its made up profile', async () => {
    getPanelContext.mockResolvedValue(DEMO)

    const response = await readProfile()

    expect(response.status).toBe(200)
    expect((await response.json()).profile).not.toBeNull()
  })

  // The refusal has to sit ahead of the format check without swallowing it: an account reaching the
  // export route with nonsense still gets the answer about the nonsense.
  it('leaves an account to be told about a format the export does not have', async () => {
    getPanelContext.mockResolvedValue(ACCOUNT)

    const response = await readExport(new Request('http://localhost/api/export?format=pdf'))

    expect(response.status).toBe(400)
    expect(await errorCode(response)).toBe('invalidRequest')
  })
})
