import nodemailer from 'nodemailer'
import { parseSmtpEnvironment, type Mail } from './mail'

const SMTP_CONNECTION_TIMEOUT_MS = 10_000
const SMTP_GREETING_TIMEOUT_MS = 10_000
const SMTP_SOCKET_TIMEOUT_MS = 20_000

export class MailConfigurationError extends Error {
  constructor() {
    super('mailNotConfigured')
    this.name = 'MailConfigurationError'
  }
}

export class MailDeliveryError extends Error {
  constructor(cause: unknown) {
    super('mailDeliveryFailed', { cause })
    this.name = 'MailDeliveryError'
  }
}

export async function sendMail(mail: Mail): Promise<void> {
  if (process.env.NODE_ENV === 'test') throw new MailConfigurationError()

  const environment = parseSmtpEnvironment(process.env)
  if (!environment) throw new MailConfigurationError()

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
    await transporter.sendMail({ from: environment.from, ...mail })
  } catch (error) {
    throw new MailDeliveryError(error)
  }
}
