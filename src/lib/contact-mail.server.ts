import nodemailer from 'nodemailer'
import { buildContactMail, parseContactMailEnvironment, type ContactInput, type ContactMailCopy } from './contact'

const SMTP_CONNECTION_TIMEOUT_MS = 10_000
const SMTP_GREETING_TIMEOUT_MS = 10_000
const SMTP_SOCKET_TIMEOUT_MS = 20_000

export class ContactMailConfigurationError extends Error {
  constructor() {
    super('contactMailNotConfigured')
    this.name = 'ContactMailConfigurationError'
  }
}

export class ContactMailDeliveryError extends Error {
  constructor(cause: unknown) {
    super('contactMailDeliveryFailed', { cause })
    this.name = 'ContactMailDeliveryError'
  }
}

export async function sendContactMail(input: ContactInput, copy: ContactMailCopy): Promise<void> {
  // The suite is normally starved of credentials rather than blocked, so a test that supplies its
  // own would open a real SMTP connection and deliver to a real inbox.
  if (process.env.NODE_ENV === 'test') throw new ContactMailConfigurationError()

  const environment = parseContactMailEnvironment(process.env)
  if (!environment) throw new ContactMailConfigurationError()

  const transporter = nodemailer.createTransport({
    host: environment.host,
    port: environment.port,
    secure: environment.secure,
    requireTLS: environment.requireTLS,
    auth: environment.auth,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    disableFileAccess: true,
    disableUrlAccess: true,
  })

  try {
    await transporter.sendMail(buildContactMail(input, environment, copy))
  } catch (error) {
    throw new ContactMailDeliveryError(error)
  }
}
