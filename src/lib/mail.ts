export const EMAIL_MAX_LENGTH = 254

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/
const PORT_PATTERN = /^\d+$/
const IMPLICIT_TLS_PORT = 465
const MAX_PORT = 65_535

export interface Mail {
  to: string
  subject: string
  text: string
  replyTo?: { name: string; address: string }
}

export interface SmtpEnvironment {
  host: string
  port: number
  secure: boolean
  requireTLS: boolean
  auth: { user: string; pass: string }
  from: string
}

export function hasControlCharacter(value: string): boolean {
  return CONTROL_CHARACTER_PATTERN.test(value)
}

export function isEmailAddress(value: string): boolean {
  return value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value) && !hasControlCharacter(value)
}

export function environmentText(environment: Record<string, string | undefined>, key: string): string | null {
  const value = environment[key]?.trim()
  return value ? value : null
}

export function parseSmtpEnvironment(environment: Record<string, string | undefined>): SmtpEnvironment | null {
  const host = environmentText(environment, 'SMTP_SERVER')
  const user = environmentText(environment, 'SMTP_USER')
  const pass = environmentText(environment, 'SMTP_PASSWORD')
  const portText = environmentText(environment, 'SMTP_PORT')
  const from = environmentText(environment, 'SMTP_FROM')

  if (!host || !user || !pass || !portText || !PORT_PATTERN.test(portText) || !from) return null

  const port = Number(portText)
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) return null
  if (hasControlCharacter(host) || hasControlCharacter(from)) return null

  const secure = port === IMPLICIT_TLS_PORT

  return { host, port, secure, requireTLS: !secure, auth: { user, pass }, from }
}
