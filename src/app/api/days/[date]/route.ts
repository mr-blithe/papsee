import { apiError } from '@/lib/api'
import { getPanelContext } from '@/lib/panel-context'
import { isPapDayKey } from '@/lib/pap'
import { encodeDayPayloadHeader, type DayPayloadCard } from '@/lib/pap/day-payload'
import type { DigitalDay } from '@/lib/pap/digital'
import { demoDay } from '@/lib/therapy/demo'
import { readDayChannelSamples, readStoredDay } from '@/lib/therapy/repository'
import { toDigitalDay } from '@/lib/therapy/stored-day'

// A night of waveforms is larger than the 4.5 MB a Vercel function may return, and only a streamed
// body is exempt: https://vercel.com/docs/functions/limitations#request-body-size
function payloadResponse(card: DayPayloadCard, day: DigitalDay, etag: string | null): Response {
  const header = encodeDayPayloadHeader(card, day)
  const blocks = day.sessions.flatMap((session) => session.channels.map((channel) => channel.samples))
  const total = blocks.reduce((bytes, block) => bytes + block.byteLength, header.byteLength)

  let next = -1
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (next < 0) {
        controller.enqueue(header)
        next = 0
        return
      }

      if (next >= blocks.length) {
        controller.close()
        return
      }

      controller.enqueue(blocks[next])
      next += 1
    },
  })

  const headers: Record<string, string> = {
    'content-type': 'application/octet-stream',
    'content-length': String(total),
    'cache-control': 'private, no-cache',
  }
  if (etag) headers.etag = etag

  return new Response(stream, { headers })
}

export async function GET(request: Request, context: RouteContext<'/api/days/[date]'>) {
  const panel = await getPanelContext()
  if (!panel) return apiError('unauthorized')

  const { date } = await context.params
  if (!isPapDayKey(date)) return apiError('invalidRequest')

  if (panel.demo) {
    const night = demoDay(Date.now(), date)
    if (!night) return apiError('notFound')

    return payloadResponse(night.card, night.day, null)
  }

  const userId = panel.userId
  const stored = await readStoredDay(userId, date)
  if (!stored) return apiError('notFound')

  const etag = `"${date}-${stored.channels.length}-${stored.endMs}"`
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag } })

  const card: DayPayloadCard = {
    brand: stored.brand,
    device: stored.device,
    settingGroups: stored.settingGroups,
    unreadable: stored.unreadable,
  }

  return payloadResponse(card, toDigitalDay(stored, await readDayChannelSamples(userId, stored.id)), etag)
}
