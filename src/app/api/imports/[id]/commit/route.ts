import { apiError, isUuid } from '@/lib/api'
import { getPanelContext } from '@/lib/panel-context'
import { advanceCommit } from '@/lib/therapy/commit'

// The route may run for a minute; the loop below stops well short of that so the response is always
// the handler's own rather than a platform timeout.
export const maxDuration = 60

const COMMIT_BUDGET_MS = 45_000

export async function POST(request: Request, context: RouteContext<'/api/imports/[id]/commit'>) {
  const panel = await getPanelContext()
  if (!panel) return apiError('unauthorized')
  if (panel.demo) return apiError('readOnlyDemo')

  const { id } = await context.params
  if (!isUuid(id)) return apiError('notFound')

  const result = await advanceCommit(panel.userId, id, COMMIT_BUDGET_MS)

  if (result.status === 'notFound') return apiError('notFound')
  if (result.status === 'empty') return apiError('emptyCard')
  if (result.status === 'unsupported') return apiError('unsupportedCard', { brand: result.brand })

  return Response.json({
    done: result.done,
    committed: result.committed,
    remaining: result.remaining,
    unreadable: result.unreadable,
  })
}
