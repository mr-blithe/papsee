// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const findShareByTokenHash = vi.fn<(hash: string) => Promise<{ userId: string; expiresAt: Date } | null>>()

vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/session', () => ({ getSession: async () => null }))
vi.mock('@/lib/therapy/repository', () => ({
  findShareByTokenHash: (hash: string) => findShareByTokenHash(hash),
}))

const { GET } = await import('./route')

const ORIGIN = 'https://papsee.test'
const TOKEN = 'a-token'
const NOT_FOUND_DIGEST = 'NEXT_HTTP_ERROR_FALLBACK;404'

type Outcome =
  { kind: 'redirect'; status: number; location: string | null } | { kind: 'thrown'; digest: string | undefined }

/**
 * `notFound()` throws rather than returning, so a handler called directly has two possible shapes.
 * Reporting both through one value keeps a failure legible: an assertion that expected a 404 prints
 * the host the handler would have sent the reader to instead.
 */
async function redeem(locale: string): Promise<Outcome> {
  try {
    const response = await GET(new NextRequest(`${ORIGIN}/${locale}/share/${TOKEN}`), {
      params: Promise.resolve({ locale, token: TOKEN }),
    })

    return { kind: 'redirect', status: response.status, location: response.headers.get('location') }
  } catch (error) {
    return { kind: 'thrown', digest: (error as { digest?: string }).digest }
  }
}

describe('share redeem handler', () => {
  beforeEach(() => {
    findShareByTokenHash.mockReset()
    findShareByTokenHash.mockResolvedValue(null)
  })

  it('sends a reader holding a live link to the panel, on this origin', async () => {
    findShareByTokenHash.mockResolvedValue({ userId: 'owner', expiresAt: new Date(Date.now() + 60_000) })

    expect(await redeem('en')).toEqual({
      kind: 'redirect',
      status: 307,
      location: `${ORIGIN}/panel/overview`,
    })
  })

  it('keeps the locale prefix a Turkish reader arrived with', async () => {
    findShareByTokenHash.mockResolvedValue({ userId: 'owner', expiresAt: new Date(Date.now() + 60_000) })

    expect(await redeem('tr')).toEqual({
      kind: 'redirect',
      status: 307,
      location: `${ORIGIN}/tr/panel/overview`,
    })
  })

  it('sends a dead link to the share notice, on this origin', async () => {
    expect(await redeem('en')).toEqual({
      kind: 'redirect',
      status: 307,
      location: `${ORIGIN}/share`,
    })
  })

  // A route handler runs no layout, so the `hasLocale` guard in `[locale]/layout.tsx` never sees this
  // request, and `src/proxy.ts` skips any path carrying a dot. Whatever arrives in the locale segment
  // reaches `getPathname` exactly as written unless this handler checks it.
  it.each([
    ['a slash-escaped host', '%2Fattacker.example'],
    ['a backslash-escaped host', '%5Cattacker.example'],
  ])('refuses %s in the locale segment rather than redirecting off site', async (_label, encoded) => {
    expect(await redeem(decodeURIComponent(encoded))).toEqual({ kind: 'thrown', digest: NOT_FOUND_DIGEST })
  })

  it('refuses a locale this app does not ship', async () => {
    expect(await redeem('de')).toEqual({ kind: 'thrown', digest: NOT_FOUND_DIGEST })
  })
})
