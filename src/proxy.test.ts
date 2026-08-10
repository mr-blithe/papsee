// @vitest-environment node

import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { DEMO_COOKIE, DEMO_COOKIE_VALUE } from '@/lib/demo-cookie'
import { SHARE_COOKIE } from '@/lib/share-cookie'
import { proxy } from './proxy'

const ORIGIN = 'http://localhost:3000'
const SESSION_COOKIE = 'better-auth.session_token=Ln5rQ0dXKb2wYt8.9f1c3a7e'

function request(pathname: string, cookie?: string) {
  return new NextRequest(new URL(pathname, ORIGIN), {
    headers: cookie ? { cookie } : undefined,
  })
}

function location(response: Response) {
  const header = response.headers.get('location')
  return header ? new URL(header, ORIGIN).pathname : null
}

describe('panel protection', () => {
  it('sends a signed out visitor to the English sign in page', () => {
    const response = proxy(request('/panel/therapy'))

    expect(response.status).toBe(307)
    expect(location(response)).toBe('/sign-in')
  })

  it('keeps the Turkish prefix when bouncing a signed out visitor', () => {
    const response = proxy(request('/tr/panel/therapy'))

    expect(response.status).toBe(307)
    expect(location(response)).toBe('/tr/sign-in')
  })

  it('lets a visitor carrying a session cookie through to the panel', () => {
    const response = proxy(request('/panel/therapy', SESSION_COOKIE))

    expect(location(response)).toBe(null)
    expect(response.status).toBe(200)
  })

  it('lets a Turkish visitor carrying a session cookie through to the panel', () => {
    const response = proxy(request('/tr/panel/therapy', SESSION_COOKIE))

    expect(location(response)).toBe(null)
    expect(response.status).toBe(200)
  })

  it('leaves the sign in page reachable, so a bounce cannot loop', () => {
    for (const pathname of ['/sign-in', '/tr/sign-in']) {
      const response = proxy(request(pathname))

      expect(location(response), pathname).toBe(null)
    }
  })

  it('protects the panel by path segment, not by prefix', () => {
    const response = proxy(request('/panelling'))

    expect(location(response)).toBe(null)
  })

  it('lets a visitor reading the example patient through to the panel', () => {
    const response = proxy(request('/panel/therapy', `${DEMO_COOKIE}=${DEMO_COOKIE_VALUE}`))

    expect(location(response)).toBe(null)
    expect(response.status).toBe(200)
  })

  it('lets a visitor holding a share link through to the panel', () => {
    const response = proxy(request('/panel/overview', `${SHARE_COOKIE}=HqL3n8Mc0pQ7rTvB2sYd4Xf6ZjW1kA9eGuNiO5bC3xE`))

    expect(location(response)).toBe(null)
    expect(response.status).toBe(200)
  })

  it('keeps the Turkish prefix for a visitor holding a share link', () => {
    const response = proxy(request('/tr/panel/overview', `${SHARE_COOKIE}=HqL3n8Mc0pQ7rTvB2sYd4Xf6ZjW1kA9eGuNiO5bC3xE`))

    expect(location(response)).toBe(null)
    expect(response.status).toBe(200)
  })

  it('leaves the link redeem route reachable without any cookie at all', () => {
    for (const pathname of ['/share/HqL3n8Mc0pQ7rTvB2sYd4Xf6ZjW1kA9eGuNiO5bC3xE', '/share']) {
      const response = proxy(request(pathname))

      expect(location(response), pathname).toBe(null)
    }
  })

  // The panel reads the demo cookie by value, so the guard has to as well. Opening the gate on the
  // name alone would let any stray papsee.demo cookie stand in for a session.
  it('bounces a visitor whose demo cookie does not carry the value the panel reads', () => {
    const response = proxy(request('/panel/therapy', `${DEMO_COOKIE}=nonsense`))

    expect(response.status).toBe(307)
    expect(location(response)).toBe('/sign-in')
  })
})

describe('locale routing survives the auth guard', () => {
  it('hands back the next-intl redirect that strips a redundant default prefix', () => {
    const response = proxy(request('/en/panel/therapy'))

    expect(response.status).toBe(307)
    expect(location(response)).toBe('/panel/therapy')
  })

  it('rewrites rather than redirects a public Turkish page', () => {
    const response = proxy(request('/tr'))

    expect(location(response)).toBe(null)
    expect(response.status).toBe(200)
  })
})
