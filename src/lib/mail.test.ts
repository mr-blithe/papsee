import { describe, expect, it } from 'vitest'
import { parseSmtpEnvironment } from './mail'

const SMTP = {
  SMTP_SERVER: 'smtp.example.com',
  SMTP_USER: 'smtp-user',
  SMTP_PASSWORD: 'smtp-password',
  SMTP_PORT: '587',
  SMTP_FROM: 'PapSee <mail@papsee.example>',
}

describe('parseSmtpEnvironment', () => {
  it('configures a sender without an administrator address, which is what account mail has', () => {
    expect(parseSmtpEnvironment(SMTP)).toEqual({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'smtp-user', pass: 'smtp-password' },
      from: 'PapSee <mail@papsee.example>',
    })
  })

  it('refuses a sender address carrying a header injection', () => {
    expect(
      parseSmtpEnvironment({ ...SMTP, SMTP_FROM: 'PapSee <mail@papsee.example>\r\nBcc: victim@example.com' }),
    ).toBe(null)
  })
})
