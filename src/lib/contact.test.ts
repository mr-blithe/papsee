import { describe, expect, it } from 'vitest'
import { CONTACT_LIMITS, buildContactMail, parseContactInput, parseContactMailEnvironment } from './contact'

const COMPLETE = {
  name: '  Ada Lovelace  ',
  email: '  ada@example.com  ',
  topic: 'privacy',
  message: '  Please delete my contact request.  ',
  locale: 'en',
  turnstileToken: 'verified-token',
}

describe('contact input', () => {
  it('trims a complete submission into the values that will be delivered', () => {
    expect(parseContactInput(COMPLETE)).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      topic: 'privacy',
      message: 'Please delete my contact request.',
      locale: 'en',
      turnstileToken: 'verified-token',
    })
  })

  it('rejects malformed addresses and header control characters', () => {
    expect(parseContactInput({ ...COMPLETE, email: 'ada.example.com' })).toBeNull()
    expect(parseContactInput({ ...COMPLETE, email: 'ada@example.com\r\nBcc: victim@example.com' })).toBeNull()
    expect(parseContactInput({ ...COMPLETE, name: 'Ada\nBcc' })).toBeNull()
  })

  it('rejects unknown topics and locales instead of putting unchecked values into the email', () => {
    expect(parseContactInput({ ...COMPLETE, topic: 'sales' })).toBeNull()
    expect(parseContactInput({ ...COMPLETE, locale: 'de' })).toBeNull()
  })

  it('rejects empty or excessive fields at the exact server-side limits', () => {
    expect(parseContactInput({ ...COMPLETE, name: '' })).toBeNull()
    expect(parseContactInput({ ...COMPLETE, message: 'x'.repeat(CONTACT_LIMITS.message + 1) })).toBeNull()
    expect(parseContactInput({ ...COMPLETE, turnstileToken: '' })).toBeNull()
  })
})

describe('contact email', () => {
  it('reaches the administrator while replies go to the visitor', () => {
    const input = parseContactInput(COMPLETE)
    expect(input).not.toBeNull()

    expect(
      buildContactMail(
        input!,
        { adminEmail: 'admin@papsee.example' },
        {
          subject: '[PapSee] Contact: privacy',
          name: 'Name',
          email: 'Email',
          topic: 'Topic',
          topicValue: 'Privacy and personal data',
          locale: 'Locale',
        },
      ),
    ).toEqual({
      to: 'admin@papsee.example',
      replyTo: { name: 'Ada Lovelace', address: 'ada@example.com' },
      subject: '[PapSee] Contact: privacy',
      text: [
        'Name: Ada Lovelace',
        'Email: ada@example.com',
        'Topic: Privacy and personal data',
        'Locale: en',
        '',
        'Please delete my contact request.',
      ].join('\n'),
    })
  })
})

describe('SMTP environment', () => {
  const environment = {
    SMTP_SERVER: 'smtp.example.com',
    SMTP_USER: 'smtp-user',
    SMTP_PASSWORD: 'smtp-password',
    SMTP_PORT: '587',
    SMTP_FROM: 'PapSee <contact@papsee.example>',
    ADMIN_EMAIL: 'admin@papsee.example',
  }

  it('uses STARTTLS for the submission port', () => {
    expect(parseContactMailEnvironment(environment)).toEqual({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'smtp-user', pass: 'smtp-password' },
      from: 'PapSee <contact@papsee.example>',
      adminEmail: 'admin@papsee.example',
    })
  })

  it('uses implicit TLS on port 465', () => {
    expect(parseContactMailEnvironment({ ...environment, SMTP_PORT: '465' })).toMatchObject({
      port: 465,
      secure: true,
      requireTLS: false,
    })
  })

  it('fails closed when a credential is missing or the port is invalid', () => {
    expect(parseContactMailEnvironment({ ...environment, SMTP_PASSWORD: '' })).toBeNull()
    expect(parseContactMailEnvironment({ ...environment, SMTP_PORT: 'not-a-port' })).toBeNull()
    expect(parseContactMailEnvironment({ ...environment, SMTP_PORT: '70000' })).toBeNull()
  })
})
