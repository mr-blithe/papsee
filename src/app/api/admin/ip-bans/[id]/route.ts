import { getAdminSession } from '@/lib/admin/access'
import { unbanIp } from '@/lib/admin/repository'
import { apiError, isUuid } from '@/lib/api'

export async function DELETE(_request: Request, context: RouteContext<'/api/admin/ip-bans/[id]'>) {
  if (!(await getAdminSession())) return apiError('forbidden')

  const { id } = await context.params
  if (!isUuid(id)) return apiError('notFound')

  return (await unbanIp(id)) ? new Response(null, { status: 204 }) : apiError('notFound')
}
