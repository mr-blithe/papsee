import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_REQUEST_BODY_BYTES } from '@/lib/api'
import { encodePapBundle } from '@/lib/pap/bundle'
import type { PapFile } from '@/lib/pap'
import { batchForUpload, commitUpload, TherapyApiError, UPLOAD_BATCH_BUDGET_BYTES } from './client'

function file(path: string, bytes: number): PapFile {
  return { path, data: new ArrayBuffer(bytes) }
}

const KB = 1024

describe('splitting a card into upload batches', () => {
  it('keeps every batch under the budget, because the platform drops a larger request before the handler sees it', () => {
    const files = Array.from({ length: 40 }, (_, index) => file(`DATALOG/20260808/f${index}.edf`, 300 * KB))

    for (const batch of batchForUpload(files, UPLOAD_BATCH_BUDGET_BYTES)) {
      const size = batch.reduce((total, entry) => total + entry.data.byteLength, 0)
      expect(size).toBeLessThanOrEqual(UPLOAD_BATCH_BUDGET_BYTES)
    }
  })

  it('sends every file exactly once, in the order the card gave them', () => {
    const files = Array.from({ length: 25 }, (_, index) => file(`f${index}.edf`, 500 * KB))

    const sent = batchForUpload(files, UPLOAD_BATCH_BUDGET_BYTES).flat()

    expect(sent.map((entry) => entry.path)).toEqual(files.map((entry) => entry.path))
  })

  it('splits a file bigger than the budget, because one device session can outgrow a single request', () => {
    const files = [file('small.json', 10), file('huge.edf', UPLOAD_BATCH_BUDGET_BYTES * 2 + 5), file('after.edf', 10)]

    for (const batch of batchForUpload(files, UPLOAD_BATCH_BUDGET_BYTES)) {
      const size = batch.reduce((total, chunk) => total + chunk.data.byteLength, 0)
      expect(size).toBeLessThanOrEqual(UPLOAD_BATCH_BUDGET_BYTES)
    }
  })

  it('cuts an oversize file into contiguous chunks covering it exactly, because the server appends them blind', () => {
    const length = UPLOAD_BATCH_BUDGET_BYTES * 2 + 5

    const chunks = batchForUpload([file('huge.edf', length)], UPLOAD_BATCH_BUDGET_BYTES).flat()

    expect(chunks.length).toBeGreaterThan(1)
    let covered = 0
    for (const chunk of chunks) {
      expect(chunk.offset).toBe(covered)
      covered += chunk.data.byteLength
    }
    expect(covered).toBe(length)
  })

  it('keeps a file that fits whole in one chunk, so an ordinary card never needs an append', () => {
    const files = [file('small.json', 10), file('str.edf', 900 * KB)]

    const chunks = batchForUpload(files, UPLOAD_BATCH_BUDGET_BYTES).flat()

    expect(chunks.map((chunk) => chunk.offset)).toEqual([0, 0])
  })

  it('sends nothing for an empty card instead of an empty request', () => {
    expect(batchForUpload([], UPLOAD_BATCH_BUDGET_BYTES)).toEqual([])
  })

  it('leaves room for the manifest, so the encoded body still fits what the platform accepts', () => {
    const files = Array.from({ length: 200 }, (_, index) => file(`DATALOG/20260808/2026080${index}_BRP.edf`, 25 * KB))

    for (const batch of batchForUpload(files, UPLOAD_BATCH_BUDGET_BYTES)) {
      expect(encodePapBundle(batch).byteLength).toBeLessThanOrEqual(MAX_REQUEST_BODY_BYTES)
    }
  })
})

describe('driving a commit to the end', () => {
  function stubFetch(slices: { done: boolean; committed: string[]; remaining: number }[]) {
    const calls: string[] = []
    vi.stubGlobal('fetch', async (path: string) => {
      calls.push(path)
      const slice = slices.shift()
      if (!slice) throw new Error('the loop asked for more slices than the server had')

      return new Response(JSON.stringify(slice), { status: 200, headers: { 'content-type': 'application/json' } })
    })

    return calls
  }

  afterEach(() => vi.unstubAllGlobals())

  it('keeps asking until the server says it is done, so a year does not import as one night', async () => {
    const calls = stubFetch([
      { done: false, committed: ['2026-07-01', '2026-07-02'], remaining: 3 },
      { done: false, committed: ['2026-07-03', '2026-07-04'], remaining: 1 },
      { done: true, committed: ['2026-07-05'], remaining: 0 },
    ])

    const dates = await commitUpload('11111111-1111-1111-1111-111111111111')

    expect(dates).toEqual(['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'])
    expect(calls).toHaveLength(3)
  })

  it('reports progress that only ever moves forward, so a reader is not told it went backwards', async () => {
    stubFetch([
      { done: false, committed: ['2026-07-01'], remaining: 2 },
      { done: false, committed: ['2026-07-02'], remaining: 1 },
      { done: true, committed: ['2026-07-03'], remaining: 0 },
    ])

    const seen: number[] = []
    await commitUpload('11111111-1111-1111-1111-111111111111', (progress) => seen.push(progress.committed))

    expect(seen).toEqual([1, 2, 3])
  })

  it('retries a failed slice rather than throwing away an upload that took minutes', async () => {
    let attempt = 0
    vi.stubGlobal('fetch', async () => {
      attempt += 1
      if (attempt === 1) return new Response(JSON.stringify({ error: 'unknown' }), { status: 500 })

      return new Response(JSON.stringify({ done: true, committed: ['2026-07-01'], remaining: 0 }), { status: 200 })
    })

    await expect(commitUpload('11111111-1111-1111-1111-111111111111')).resolves.toEqual(['2026-07-01'])
    expect(attempt).toBe(2)
  })

  it('gives up immediately on a card the server cannot read, because retrying cannot change that', async () => {
    let attempt = 0
    vi.stubGlobal('fetch', async () => {
      attempt += 1

      return new Response(JSON.stringify({ error: 'unsupportedCard' }), { status: 422 })
    })

    await expect(commitUpload('11111111-1111-1111-1111-111111111111')).rejects.toThrow(TherapyApiError)
    expect(attempt).toBe(1)
  })
})
