// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoredDay } from '@/lib/therapy/repository'

const getPanelContext = vi.fn()
const readStoredDay = vi.fn<(userId: string, date: string) => Promise<StoredDay | null>>()
const readDayChannelSamples = vi.fn<() => Promise<Map<string, Uint8Array>>>()

vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/panel-context', () => ({ getPanelContext: () => getPanelContext() }))
vi.mock('@/lib/therapy/repository', () => ({
  readStoredDay: (userId: string, date: string) => readStoredDay(userId, date),
  readDayChannelSamples: () => readDayChannelSamples(),
}))

const { GET } = await import('./route')

const DATE = '2026-08-09'
const NOON_MS = Date.UTC(2026, 7, 9, 12)
const FILLED_AT = new Date('2026-08-10T06:30:00.000Z')

/**
 * A night the card summarised but never wrote a waveform for. Two accounts each holding one of these
 * agree on everything a reader can see from outside: the date, the empty channel list and the noon
 * the day is anchored to.
 */
function summaryOnlyNight(id: string): StoredDay {
  return {
    id,
    date: DATE,
    startMs: NOON_MS,
    endMs: NOON_MS,
    filledAt: FILLED_AT,
    summary: null,
    settings: null,
    sessionBounds: [],
    brand: 'resmed',
    device: null,
    settingGroups: [],
    unreadable: [],
    events: [],
    channels: [],
  }
}

function get(ifNoneMatch?: string) {
  const headers = ifNoneMatch ? { 'if-none-match': ifNoneMatch } : undefined

  return GET(new Request(`http://localhost/api/days/${DATE}`, { headers }), {
    params: Promise.resolve({ date: DATE }),
  })
}

async function signedInAs(userId: string, night: StoredDay | null, ifNoneMatch?: string) {
  getPanelContext.mockResolvedValue({ view: 'account', userId })
  readStoredDay.mockResolvedValue(night)

  return get(ifNoneMatch)
}

beforeEach(() => {
  getPanelContext.mockReset()
  readStoredDay.mockReset()
  readDayChannelSamples.mockReset()
  readDayChannelSamples.mockResolvedValue(new Map())
})

describe('reading one night back', () => {
  it('validates a night against the row it came from, so two accounts never share one', async () => {
    const mine = await signedInAs('user-a', summaryOnlyNight('day-a'))
    const theirs = await signedInAs('user-b', summaryOnlyNight('day-b'))

    expect(mine.headers.get('etag')).toBeTruthy()
    expect(theirs.headers.get('etag')).not.toBe(mine.headers.get('etag'))
  })

  it('sends the night rather than a 304 when the validator came from another account', async () => {
    const mine = await signedInAs('user-a', summaryOnlyNight('day-a'))
    const theirs = await signedInAs('user-b', summaryOnlyNight('day-b'), mine.headers.get('etag') ?? '')

    expect(theirs.status).toBe(200)
    expect(theirs.body).not.toBeNull()
  })

  it('answers 304 when the same account asks again for a night that has not changed', async () => {
    const first = await signedInAs('user-a', summaryOnlyNight('day-a'))
    const again = await signedInAs('user-a', summaryOnlyNight('day-a'), first.headers.get('etag') ?? '')

    expect(again.status).toBe(304)
  })

  it('sends the night again once it has been parsed, rather than serving the summary from cache', async () => {
    const summaryOnly = await signedInAs('user-a', { ...summaryOnlyNight('day-a'), filledAt: null })
    const filled = await signedInAs('user-a', summaryOnlyNight('day-a'), summaryOnly.headers.get('etag') ?? '')

    expect(filled.status).toBe(200)
  })

  it('refuses a date the day key rules do not accept before it reaches the database', async () => {
    getPanelContext.mockResolvedValue({ view: 'account', userId: 'user-a' })

    const response = await GET(new Request('http://localhost/api/days/nonsense'), {
      params: Promise.resolve({ date: 'nonsense' }),
    })

    expect(response.status).toBe(400)
    expect(readStoredDay).not.toHaveBeenCalled()
  })
})
