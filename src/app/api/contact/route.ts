import { getTranslations } from 'next-intl/server'
import { sendContactMail } from '@/lib/contact-mail.server'
import { parseContactInput, type ContactMailCopy, type ContactTopic } from '@/lib/contact'
import { MailConfigurationError, MailDeliveryError } from '@/lib/mail.server'
import type { Locale } from '@/i18n/routing'
import { TurnstileUnavailableError, verifyContactChallenge } from '@/lib/turnstile.server'

export const runtime = 'nodejs'

const CONTACT_REQUEST_MAX_BYTES = 16 * 1024

type ContactApiError = 'invalidRequest' | 'challengeFailed' | 'serviceUnavailable' | 'deliveryFailed' | 'notConfigured'

function errorResponse(error: ContactApiError, status: number): Response {
  return Response.json({ error }, { status })
}

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > CONTACT_REQUEST_MAX_BYTES) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

async function contactMailCopy(locale: Locale, topic: ContactTopic): Promise<ContactMailCopy> {
  const [mail, contact] = await Promise.all([
    getTranslations({ locale, namespace: 'ContactMail' }),
    getTranslations({ locale, namespace: 'Contact' }),
  ])
  const topicValue = contact(`topic_${topic}`)

  return {
    subject: mail('subject', { topic: topicValue }),
    name: mail('name'),
    email: mail('email'),
    topic: mail('topic'),
    topicValue,
    locale: mail('locale'),
  }
}

export async function POST(request: Request) {
  const input = parseContactInput(await readBody(request))
  if (!input) return errorResponse('invalidRequest', 400)

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!turnstileSecret) return errorResponse('notConfigured', 503)

  try {
    if (!(await verifyContactChallenge(input.turnstileToken, turnstileSecret))) {
      return errorResponse('challengeFailed', 400)
    }
  } catch (error) {
    if (error instanceof TurnstileUnavailableError) return errorResponse('serviceUnavailable', 503)
    throw error
  }

  try {
    await sendContactMail(input, await contactMailCopy(input.locale, input.topic))
  } catch (error) {
    if (error instanceof MailConfigurationError) return errorResponse('notConfigured', 503)
    if (error instanceof MailDeliveryError) return errorResponse('deliveryFailed', 502)
    throw error
  }

  return Response.json({ sent: true })
}
