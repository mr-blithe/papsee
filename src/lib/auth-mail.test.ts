import { describe, expect, it } from 'vitest'
import { buildAuthMail } from './auth-mail'

const COPY = {
  subject: 'Confirm your PapSee email address',
  intro: 'Open this link to confirm your address.',
  expiry: 'The link works for 60 minutes.',
  ignore: 'If you did not ask for an account, ignore this email.',
}

describe('buildAuthMail', () => {
  it('reaches the reader rather than the administrator the contact form writes to', () => {
    expect(buildAuthMail('reader@example.com', 'https://papsee.example/verify', COPY).to).toBe('reader@example.com')
  })

  it('leaves the link alone on a line of its own, so no mail client folds it into a sentence', () => {
    const { text } = buildAuthMail('reader@example.com', 'https://papsee.example/api/auth/verify-email?token=abc', COPY)

    expect(text.split('\n')).toEqual([
      'Open this link to confirm your address.',
      '',
      'https://papsee.example/api/auth/verify-email?token=abc',
      '',
      'The link works for 60 minutes.',
      'If you did not ask for an account, ignore this email.',
    ])
  })

  it('carries the code through untouched, including a leading zero', () => {
    expect(buildAuthMail('reader@example.com', 'Code: 004821', COPY).text).toContain('Code: 004821')
  })
})
