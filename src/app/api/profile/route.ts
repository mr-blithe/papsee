import { apiError } from '@/lib/api'
import { getPanelContext } from '@/lib/panel-context'
import { DEMO_PROFILE } from '@/lib/therapy/demo'
import { parseProfileInput } from '@/lib/therapy/profile-input'
import { getProfile, saveProfile } from '@/lib/therapy/repository'

export async function GET() {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')

  return Response.json({ profile: context.demo ? DEMO_PROFILE : await getProfile(context.userId) })
}

export async function PUT(request: Request) {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')
  if (context.demo) return apiError('readOnlyDemo')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('invalidRequest')
  }

  const profile = parseProfileInput(body)
  if (!profile) return apiError('invalidRequest')

  await saveProfile(context.userId, profile)

  return Response.json({ profile })
}
