import { CONFIRMATION_HEADER } from '@/lib/account-confirmation'
import { consumeAccountConfirmation } from '@/lib/account-confirmation.server'
import { apiError } from '@/lib/api'
import { getPanelContext, readOnlyErrorCode } from '@/lib/panel-context'
import { createImport, deleteAllTherapyData } from '@/lib/therapy/repository'

export const runtime = 'nodejs'

export async function POST() {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')
  if (context.view !== 'account') return apiError(readOnlyErrorCode(context.view))

  const id = await createImport(context.userId)

  return Response.json({ id }, { status: 201 })
}

export async function DELETE(request: Request) {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')
  if (context.view !== 'account') return apiError(readOnlyErrorCode(context.view))

  const code = request.headers.get(CONFIRMATION_HEADER)
  if (!(await consumeAccountConfirmation(context.userId, 'deleteData', code))) {
    return apiError('confirmationFailed')
  }

  return Response.json({ removed: await deleteAllTherapyData(context.userId) })
}
