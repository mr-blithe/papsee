import { apiError, isUuid, MAX_REQUEST_BODY_BYTES } from '@/lib/api'
import { getPanelContext, readOnlyErrorCode } from '@/lib/panel-context'
import { decodePapBundle, PapBundleError } from '@/lib/pap/bundle'
import { storeImportFiles } from '@/lib/therapy/repository'

export async function POST(request: Request, context: RouteContext<'/api/imports/[id]/files'>) {
  const panel = await getPanelContext()
  if (!panel) return apiError('unauthorized')
  if (panel.view !== 'account') return apiError(readOnlyErrorCode(panel.view))

  const { id } = await context.params
  if (!isUuid(id)) return apiError('notFound')

  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BODY_BYTES) return apiError('payloadTooLarge')

  const body = await request.arrayBuffer()
  if (body.byteLength > MAX_REQUEST_BODY_BYTES) return apiError('payloadTooLarge')

  let chunks
  try {
    chunks = decodePapBundle(body)
  } catch (error) {
    if (error instanceof PapBundleError) return apiError('invalidRequest')
    throw error
  }

  const stored = await storeImportFiles(panel.userId, id, chunks)
  if (stored === 'notOpen') return apiError('notFound')
  if (stored === 'outOfOrder') return apiError('invalidRequest')

  return new Response(null, { status: 204 })
}
