import { routing, type Locale } from '@/i18n/routing'
import {
  EMAIL_MAX_LENGTH,
  environmentText,
  hasControlCharacter,
  isEmailAddress,
  parseSmtpEnvironment,
  type SmtpEnvironment,
} from '@/lib/mail'

export const CONTACT_TOPICS = ['general', 'account', 'privacy', 'technical'] as const

export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export const CONTACT_LIMITS = {
  name: 100,
  email: EMAIL_MAX_LENGTH,
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

export interface ContactMailEnvironment extends SmtpEnvironment {
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

function requiredText(value: unknown, maximumLength: number, rejectControls = false): string | null {
  if (typeof value !== 'string') return null

  const text = value.trim()
  if (text.length === 0 || text.length > maximumLength) return null
  if (rejectControls && hasControlCharacter(text)) return null

  return text
}

function isContactTopic(value: string): value is ContactTopic {
  return CONTACT_TOPICS.some((topic) => topic === value)
}

function isLocale(value: string): value is Locale {
  return routing.locales.some((locale) => locale === value)
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
    !isEmailAddress(email) ||
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
  environment: Pick<ContactMailEnvironment, 'adminEmail'>,
  copy: ContactMailCopy,
) {
  return {
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

export function parseContactMailEnvironment(
  environment: Record<string, string | undefined>,
): ContactMailEnvironment | null {
  const smtp = parseSmtpEnvironment(environment)
  const adminEmail = environmentText(environment, 'ADMIN_EMAIL')

  if (!smtp || !adminEmail || !isEmailAddress(adminEmail)) return null

  return { ...smtp, adminEmail }
}
