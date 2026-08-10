// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendContactMail } from './contact-mail.server'
import { MailConfigurationError } from './mail.server'

const INPUT = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  topic: 'general',
  message: 'Hello.',
  locale: 'en',
  turnstileToken: 'verified-token',
} as const

const COPY = {
  subject: '[PapSee] Contact: general',
  name: 'Name',
  email: 'Email',
  topic: 'Topic',
  topicValue: 'General',
  locale: 'Language',
  localeValue: 'English',
  message: 'Message',
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sendContactMail', () => {
  it('refuses to open a connection under the test environment even when fully configured', async () => {
    vi.stubEnv('SMTP_SERVER', 'smtp.example.com')
    vi.stubEnv('SMTP_USER', 'papsee')
    vi.stubEnv('SMTP_PASSWORD', 'secret')
    vi.stubEnv('SMTP_PORT', '587')
    vi.stubEnv('SMTP_FROM', 'PapSee <contact@papsee.example>')
    vi.stubEnv('ADMIN_EMAIL', 'admin@papsee.example')

    expect(process.env.NODE_ENV).toBe('test')
    await expect(sendContactMail(INPUT, COPY)).rejects.toBeInstanceOf(MailConfigurationError)
  })
})
