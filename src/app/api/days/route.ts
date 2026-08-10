import type { NextRequest } from 'next/server'
import { apiError } from '@/lib/api'
import { getPanelContext } from '@/lib/panel-context'
import { isPapDayKey } from '@/lib/pap'
import { demoDayIndex } from '@/lib/therapy/demo'
import { listDays } from '@/lib/therapy/repository'

export async function GET(request: NextRequest) {
  const context = await getPanelContext()
  if (!context) return apiError('unauthorized')

  const from = request.nextUrl.searchParams.get('from')
  const to = request.nextUrl.searchParams.get('to')

  if ((from !== null && !isPapDayKey(from)) || (to !== null && !isPapDayKey(to))) return apiError('invalidRequest')

  if (context.demo) {
    const days = demoDayIndex(Date.now()).filter((day) => (!from || day.date >= from) && (!to || day.date <= to))
    return Response.json({ days })
  }

  return Response.json({ days: await listDays(context.userId, from, to) })
}
