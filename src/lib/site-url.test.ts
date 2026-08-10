import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSiteUrl } from './site-url'

describe('getSiteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the production domain exposed by Vercel', () => {
    expect(getSiteUrl('papsee.example')).toEqual(new URL('https://papsee.example'))
  })

  it('uses the local app origin outside Vercel', () => {
    expect(getSiteUrl()).toEqual(new URL('http://localhost:3000'))
  })

  it('lets a self hosted instance name itself', () => {
    vi.stubEnv('SITE_DOMAIN', 'pap.example.org')

    expect(getSiteUrl()).toEqual(new URL('https://pap.example.org'))
  })

  it('prefers the configured domain over the one Vercel reports', () => {
    vi.stubEnv('SITE_DOMAIN', 'pap.example.org')
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'papsee.vercel.example')

    expect(getSiteUrl()).toEqual(new URL('https://pap.example.org'))
  })
})
