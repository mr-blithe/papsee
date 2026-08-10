import { describe, expect, it } from 'vitest'
import { AUTH_LOCALE_HEADER, authMailLocale } from './auth-locale'

function headers(value: string | null): Headers {
  return new Headers(value === null ? undefined : { [AUTH_LOCALE_HEADER]: value })
}

describe('authMailLocale', () => {
  it('writes the mail in the language the reader was reading', () => {
    expect(authMailLocale(headers('tr'))).toBe('tr')
    expect(authMailLocale(headers('en'))).toBe('en')
  })

  it('falls back to the default locale rather than sending an untranslated key', () => {
    expect(authMailLocale(headers(null))).toBe('en')
    expect(authMailLocale(undefined)).toBe('en')
  })

  it('refuses a locale the project does not ship, so the header cannot pick a missing catalog', () => {
    expect(authMailLocale(headers('de'))).toBe('en')
    expect(authMailLocale(headers('../../etc/passwd'))).toBe('en')
    expect(authMailLocale(headers(''))).toBe('en')
  })
})
