export const ACCOUNT_ACTIONS = ['deleteData', 'deleteAccount'] as const

export type AccountAction = (typeof ACCOUNT_ACTIONS)[number]

export const CONFIRMATION_HEADER = 'x-papsee-confirmation'

export const CONFIRMATION_ERROR_CODE = 'ACCOUNT_CONFIRMATION_FAILED'

export const CONFIRMATION_CODE_LENGTH = 6
export const CONFIRMATION_EXPIRY_MINUTES = 10
export const CONFIRMATION_ATTEMPTS = 5

export function isAccountAction(value: unknown): value is AccountAction {
  return ACCOUNT_ACTIONS.some((action) => action === value)
}

export type ConfirmationVerdict = 'accepted' | 'wrong' | 'spent'

export function confirmationVerdict(
  stored: { value: string; expiresAt: Date },
  suppliedDigest: string,
  now: Date,
): { verdict: ConfirmationVerdict; attempts: number } {
  const [expected, counter] = stored.value.split(':')
  const attempts = Number.parseInt(counter, 10) || 0

  if (stored.expiresAt < now || attempts >= CONFIRMATION_ATTEMPTS) return { verdict: 'spent', attempts }
  if (expected !== suppliedDigest) return { verdict: 'wrong', attempts }

  return { verdict: 'accepted', attempts }
}
