export class AdminApiError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'AdminApiError'
  }
}

async function readErrorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown }

    return typeof body.error === 'string' ? body.error : 'unknown'
  } catch {
    return 'unknown'
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, { ...init, credentials: 'same-origin' })
  if (!response.ok) throw new AdminApiError(await readErrorCode(response))

  return response
}

export interface IpBanResult {
  id: string
  revokedSessions: number
}

export async function blockIpAddress(ip: string, reason: string | null): Promise<IpBanResult> {
  const response = await request('/api/admin/ip-bans', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ip, reason }),
  })

  return (await response.json()) as IpBanResult
}

export async function unblockIpAddress(id: string): Promise<void> {
  await request(`/api/admin/ip-bans/${id}`, { method: 'DELETE' })
}
