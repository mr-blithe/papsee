import { routing, type Locale } from '@/i18n/routing'

export const CONTACT_TOPICS = ['general', 'account', 'privacy', 'technical'] as const

export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  message: 5000,
  turnstileToken: 2048,
} as const

export interface ContactInput {
  name: string
  email: string
  topic: ContactTopic
  message: string
  locale: Locale
  turnstileToken: string
}

export interface ContactMailEnvironment {
  host: string
  port: number
  secure: boolean
  requireTLS: boolean
  auth: { user: string; pass: string }
  from: string
  adminEmail: string
}

export interface ContactMailCopy {
  subject: string
  name: string
  email: string
  topic: string
  topicValue: string
  locale: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/
const PORT_PATTERN = /^\d+$/

function requiredText(value: unknown, maximumLength: number, rejectControls = false): string | null {
  if (typeof value !== 'string') return null

  const text = value.trim()
  if (text.length === 0 || text.length > maximumLength) return null
  if (rejectControls && CONTROL_CHARACTER_PATTERN.test(text)) return null

  return text
}

function isContactTopic(value: string): value is ContactTopic {
  return CONTACT_TOPICS.some((topic) => topic === value)
}

function isLocale(value: string): value is Locale {
  return routing.locales.some((locale) => locale === value)
}

function isEmail(value: string): boolean {
  return value.length <= CONTACT_LIMITS.email && EMAIL_PATTERN.test(value) && !CONTROL_CHARACTER_PATTERN.test(value)
}

export function parseContactInput(body: unknown): ContactInput | null {
  if (body === null || typeof body !== 'object') return null

  const input = body as Record<string, unknown>
  const name = requiredText(input.name, CONTACT_LIMITS.name, true)
  const email = requiredText(input.email, CONTACT_LIMITS.email, true)
  const topic = requiredText(input.topic, 32, true)
  const message = requiredText(input.message, CONTACT_LIMITS.message)
  const locale = requiredText(input.locale, 8, true)
  const turnstileToken = requiredText(input.turnstileToken, CONTACT_LIMITS.turnstileToken, true)

  if (
    !name ||
    !email ||
    !isEmail(email) ||
    !topic ||
    !isContactTopic(topic) ||
    !message ||
    !locale ||
    !isLocale(locale) ||
    !turnstileToken
  ) {
    return null
  }

  return { name, email, topic, message, locale, turnstileToken }
}

export function buildContactMail(
  input: ContactInput,
  environment: Pick<ContactMailEnvironment, 'from' | 'adminEmail'>,
  copy: ContactMailCopy,
) {
  return {
    from: environment.from,
    to: environment.adminEmail,
    replyTo: { name: input.name, address: input.email },
    subject: copy.subject,
    text: [
      `${copy.name}: ${input.name}`,
      `${copy.email}: ${input.email}`,
      `${copy.topic}: ${copy.topicValue}`,
      `${copy.locale}: ${input.locale}`,
      '',
      input.message,
    ].join('\n'),
  }
}

function environmentText(environment: Record<string, string | undefined>, key: string): string | null {
  const value = environment[key]?.trim()
  return value ? value : null
}

export function parseContactMailEnvironment(
  environment: Record<string, string | undefined>,
): ContactMailEnvironment | null {
  const host = environmentText(environment, 'SMTP_SERVER')
  const user = environmentText(environment, 'SMTP_USER')
  const pass = environmentText(environment, 'SMTP_PASSWORD')
  const portText = environmentText(environment, 'SMTP_PORT')
  const from = environmentText(environment, 'SMTP_FROM')
  const adminEmail = environmentText(environment, 'ADMIN_EMAIL')

  if (!host || !user || !pass || !portText || !PORT_PATTERN.test(portText) || !from || !adminEmail) return null

  const port = Number(portText)
  if (!Number.isInteger(port) || port < 1 || port > 65_535 || !isEmail(adminEmail)) return null
  if (CONTROL_CHARACTER_PATTERN.test(host) || CONTROL_CHARACTER_PATTERN.test(from)) return null

  const secure = port === 465

  return {
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    from,
    adminEmail,
  }
}
