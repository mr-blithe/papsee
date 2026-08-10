import { apiError } from '@/lib/api'
import { getPanelContext, readOnlyErrorCode } from '@/lib/panel-context'
import { createImport, deleteAllTherapyData } from '@/lib/therapy/repository'

export async function POST() {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')
  if (context.view !== 'account') return apiError(readOnlyErrorCode(context.view))

  const id = await createImport(context.userId)

  return Response.json({ id }, { status: 201 })
}

export async function DELETE() {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')
  if (context.view !== 'account') return apiError(readOnlyErrorCode(context.view))

  return Response.json({ removed: await deleteAllTherapyData(context.userId) })
}
