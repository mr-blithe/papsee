// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_COOKIE, DEMO_COOKIE_VALUE } from './demo-cookie'
import { SHARE_COOKIE } from './share-cookie'
import { hashShareToken } from './therapy/share-token.server'

const cookieStore = new Map<string, string>()

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const value = cookieStore.get(name)
        return value === undefined ? undefined : { name, value }
      },
    }),
}))

const getSession = vi.fn()
vi.mock('./session', () => ({ getSession: () => getSession() }))

const findShareByTokenHash = vi.fn()
vi.mock('./therapy/repository', () => ({
  findShareByTokenHash: (tokenHash: string) => findShareByTokenHash(tokenHash),
}))

const { getPanelContext, readOnlyErrorCode } = await import('./panel-context')

const OWNER_ID = 'user_owner'
const READER_ID = 'user_reader'
const TOKEN = 'HqL3n8Mc0pQ7rTvB2sYd4Xf6ZjW1kA9eGuNiO5bC3xE'
const MINUTE_MS = 60_000

function signedIn(userId: string) {
  getSession.mockResolvedValue({ user: { id: userId, email: 'reader@example.test' } })
}

function shareEndingIn(offsetMs: number) {
  findShareByTokenHash.mockImplementation((tokenHash: string) =>
    Promise.resolve(
      tokenHash === hashShareToken(TOKEN) ? { userId: OWNER_ID, expiresAt: new Date(Date.now() + offsetMs) } : null,
    ),
  )
}

beforeEach(() => {
  cookieStore.clear()
  getSession.mockReset()
  getSession.mockResolvedValue(null)
  findShareByTokenHash.mockReset()
  findShareByTokenHash.mockResolvedValue(null)
})

describe('reading the panel without a share', () => {
  it('turns a visitor carrying nothing away', async () => {
    expect(await getPanelContext()).toBeNull()
  })

  it('reads the panel as the signed in account', async () => {
    signedIn(READER_ID)

    expect(await getPanelContext()).toEqual({ view: 'account', userId: READER_ID })
  })

  it('serves the example patient to anyone carrying the demo cookie', async () => {
    cookieStore.set(DEMO_COOKIE, DEMO_COOKIE_VALUE)

    expect(await getPanelContext()).toEqual({ view: 'demo', userId: null })

    signedIn(READER_ID)
    expect(await getPanelContext()).toEqual({ view: 'demo', userId: READER_ID })
  })

  it('ignores a demo cookie that does not carry the value the panel writes', async () => {
    cookieStore.set(DEMO_COOKIE, 'nonsense')
    signedIn(READER_ID)

    expect(await getPanelContext()).toEqual({ view: 'account', userId: READER_ID })
  })
})

describe('reading the panel through a share link', () => {
  it('hands back the owner of the link, not the reader holding it', async () => {
    cookieStore.set(SHARE_COOKIE, TOKEN)
    shareEndingIn(MINUTE_MS)

    const context = await getPanelContext()

    expect(context?.view).toBe('shared')
    expect(context?.userId).toBe(OWNER_ID)
  })

  // Storing the token would make a copy of the table a bundle of working links, so the lookup key
  // has to be the hash and the raw value must never reach the query.
  it('looks the link up by its hash', async () => {
    cookieStore.set(SHARE_COOKIE, TOKEN)
    shareEndingIn(MINUTE_MS)

    await getPanelContext()

    expect(findShareByTokenHash).toHaveBeenCalledWith(hashShareToken(TOKEN))
    expect(findShareByTokenHash).not.toHaveBeenCalledWith(TOKEN)
  })

  // A doctor with a PapSee account of their own would otherwise open the link and see their own
  // nights, with no way to reach the ones that were shared with them.
  it('shows the shared account rather than the reader own account', async () => {
    cookieStore.set(SHARE_COOKIE, TOKEN)
    shareEndingIn(MINUTE_MS)
    signedIn(READER_ID)

    expect(await getPanelContext()).toMatchObject({ view: 'shared', userId: OWNER_ID })
  })

  it('refuses an expired link', async () => {
    cookieStore.set(SHARE_COOKIE, TOKEN)
    shareEndingIn(-MINUTE_MS)

    expect(await getPanelContext()).toBeNull()
  })

  it('drops an expired link back to the reader own account instead of locking them out', async () => {
    cookieStore.set(SHARE_COOKIE, TOKEN)
    shareEndingIn(-MINUTE_MS)
    signedIn(READER_ID)

    expect(await getPanelContext()).toEqual({ view: 'account', userId: READER_ID })
  })

  it('refuses a token that matches no link', async () => {
    cookieStore.set(SHARE_COOKIE, 'not-a-token-anyone-issued')
    shareEndingIn(MINUTE_MS)

    expect(await getPanelContext()).toBeNull()
  })

  // Both cookies at once must land on the synthetic nights, never on someone real.
  it('keeps the example patient ahead of a share', async () => {
    cookieStore.set(DEMO_COOKIE, DEMO_COOKIE_VALUE)
    cookieStore.set(SHARE_COOKIE, TOKEN)
    shareEndingIn(MINUTE_MS)

    expect(await getPanelContext()).toEqual({ view: 'demo', userId: null })
  })
})

// Three cookies can sit in one browser at once, and any of them can be stale or forged. The order is
// the whole safety property: the example patient can never be overtaken by real data, and real data
// can never be overtaken by the wrong account.
describe('every combination of cookies a browser can carry', () => {
  const demoStates = {
    'no demo cookie': null,
    'demo cookie': DEMO_COOKIE_VALUE,
    'stray demo cookie': 'nonsense',
  }

  const shareStates = {
    'no share cookie': null,
    'live link': TOKEN,
    'unknown token': 'not-a-token-anyone-issued',
    'expired link': TOKEN,
  }

  const expected: Record<string, 'demo' | 'shared' | 'account' | 'none'> = {
    'no demo cookie / no share cookie / signed out': 'none',
    'no demo cookie / no share cookie / signed in': 'account',
    'no demo cookie / live link / signed out': 'shared',
    'no demo cookie / live link / signed in': 'shared',
    'no demo cookie / unknown token / signed out': 'none',
    'no demo cookie / unknown token / signed in': 'account',
    'no demo cookie / expired link / signed out': 'none',
    'no demo cookie / expired link / signed in': 'account',
    'demo cookie / no share cookie / signed out': 'demo',
    'demo cookie / no share cookie / signed in': 'demo',
    'demo cookie / live link / signed out': 'demo',
    'demo cookie / live link / signed in': 'demo',
    'demo cookie / unknown token / signed out': 'demo',
    'demo cookie / unknown token / signed in': 'demo',
    'demo cookie / expired link / signed out': 'demo',
    'demo cookie / expired link / signed in': 'demo',
    'stray demo cookie / no share cookie / signed out': 'none',
    'stray demo cookie / no share cookie / signed in': 'account',
    'stray demo cookie / live link / signed out': 'shared',
    'stray demo cookie / live link / signed in': 'shared',
    'stray demo cookie / unknown token / signed out': 'none',
    'stray demo cookie / unknown token / signed in': 'account',
    'stray demo cookie / expired link / signed out': 'none',
    'stray demo cookie / expired link / signed in': 'account',
  }

  for (const [demoLabel, demoValue] of Object.entries(demoStates)) {
    for (const [shareLabel, shareValue] of Object.entries(shareStates)) {
      for (const session of [false, true]) {
        const label = `${demoLabel} / ${shareLabel} / ${session ? 'signed in' : 'signed out'}`

        it(`serves the ${expected[label]} view for ${label}`, async () => {
          if (demoValue) cookieStore.set(DEMO_COOKIE, demoValue)
          if (shareValue) cookieStore.set(SHARE_COOKIE, shareValue)
          if (session) signedIn(READER_ID)
          shareEndingIn(shareLabel === 'expired link' ? -MINUTE_MS : MINUTE_MS)

          const context = await getPanelContext()

          expect(context?.view ?? 'none', label).toBe(expected[label])
          if (expected[label] === 'shared') expect(context?.userId, label).toBe(OWNER_ID)
          if (expected[label] === 'account') expect(context?.userId, label).toBe(READER_ID)
        })
      }
    }
  }
})

describe('refusing to write', () => {
  it('tells a reader which view is holding them back', () => {
    expect(readOnlyErrorCode('demo')).toBe('readOnlyDemo')
    expect(readOnlyErrorCode('shared')).toBe('readOnlyShare')
  })
})
