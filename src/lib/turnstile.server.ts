const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const CONTACT_ACTION = 'contact'

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export class TurnstileUnavailableError extends Error {
  constructor() {
    super('turnstileUnavailable')
    this.name = 'TurnstileUnavailableError'
  }
}

export async function verifyContactChallenge(
  token: string,
  secret: string,
  request: Fetcher = fetch,
): Promise<boolean> {
  const response = await request(TURNSTILE_SITEVERIFY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
  })

  if (!response.ok) throw new TurnstileUnavailableError()

  let result: unknown
  try {
    result = await response.json()
  } catch {
    throw new TurnstileUnavailableError()
  }

  if (result === null || typeof result !== 'object') return false

  const verification = result as Record<string, unknown>
  return verification.success === true && verification.action === CONTACT_ACTION
}
