import { apiError } from '@/lib/api'
import { getPanelContext } from '@/lib/panel-context'
import { createImport, deleteAllTherapyData } from '@/lib/therapy/repository'

export async function POST() {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')
  if (context.demo) return apiError('readOnlyDemo')

  const id = await createImport(context.userId)

  return Response.json({ id }, { status: 201 })
}

export async function DELETE() {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')
  if (context.demo) return apiError('readOnlyDemo')

  return Response.json({ removed: await deleteAllTherapyData(context.userId) })
}
