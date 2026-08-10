const STATUS_BY_CODE = {
  invalidRequest: 400,
  unauthorized: 401,
  readOnlyDemo: 403,
  readOnlyShare: 403,
  notInSharedView: 403,
  invalidPassword: 403,
  confirmationFailed: 403,
  notFound: 404,
  tooManyShares: 409,
  payloadTooLarge: 413,
  unsupportedCard: 422,
  emptyCard: 422,
} as const

export type ApiErrorCode = keyof typeof STATUS_BY_CODE

export type ApiErrorMessageKey = ApiErrorCode | 'unknown'

export function apiErrorKey(code: string | undefined): ApiErrorMessageKey {
  return code !== undefined && code in STATUS_BY_CODE ? (code as ApiErrorCode) : 'unknown'
}

// Vercel rejects a request or response body over 4.5 MB with a platform error the handler never sees:
// https://vercel.com/docs/functions/limitations#request-body-size
export const MAX_REQUEST_BODY_BYTES = 4 * 1024 * 1024

export function apiError(code: ApiErrorCode, detail: Record<string, unknown> = {}): Response {
  return Response.json({ error: code, ...detail }, { status: STATUS_BY_CODE[code] })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID.test(value)
}
