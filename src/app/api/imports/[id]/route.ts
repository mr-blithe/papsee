import { apiError, isUuid } from '@/lib/api'
import { getPanelContext, readOnlyErrorCode } from '@/lib/panel-context'
import { deleteImport } from '@/lib/therapy/repository'

export async function DELETE(request: Request, context: RouteContext<'/api/imports/[id]'>) {
  const panel = await getPanelContext()
  if (!panel) return apiError('unauthorized')
  if (panel.view !== 'account') return apiError(readOnlyErrorCode(panel.view))

  const { id } = await context.params
  if (!isUuid(id)) return apiError('notFound')

  const deleted = await deleteImport(panel.userId, id)

  return deleted ? new Response(null, { status: 204 }) : apiError('notFound')
}
