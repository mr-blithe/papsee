import { buildContactMail, parseContactMailEnvironment, type ContactInput, type ContactMailCopy } from './contact'
import { MailConfigurationError, sendMail } from './mail.server'

export async function sendContactMail(input: ContactInput, copy: ContactMailCopy): Promise<void> {
  const environment = parseContactMailEnvironment(process.env)
  if (!environment) throw new MailConfigurationError()

  await sendMail(buildContactMail(input, environment, copy))
}
