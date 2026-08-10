import { CONFIRMATION_HEADER } from '@/lib/account-confirmation'
import { MAX_REQUEST_BODY_BYTES } from '@/lib/api'
import type { PapFile, PapImport } from '@/lib/pap'
import { encodePapBundle, type PapFileChunk } from '@/lib/pap/bundle'
import { decodeDayPayload } from '@/lib/pap/day-payload'
import type { DayIndexEntry, PatientProfile } from './repository'
import type { ShareDurationMinutes } from './shares'

export type { DayIndexEntry, PatientProfile }

const MANIFEST_HEADROOM_BYTES = 64 * 1024

export const UPLOAD_BATCH_BUDGET_BYTES = MAX_REQUEST_BODY_BYTES - MANIFEST_HEADROOM_BYTES

export class TherapyApiError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'TherapyApiError'
  }
}

async function readErrorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown }
    return typeof body.error === 'string' ? body.error : 'unknown'
  } catch {
    return 'unknown'
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, { ...init, credentials: 'same-origin' })
  if (!response.ok) throw new TherapyApiError(await readErrorCode(response))

  return response
}

export async function fetchDayIndex(range?: { from?: string; to?: string }): Promise<DayIndexEntry[]> {
  const query = new URLSearchParams()
  if (range?.from) query.set('from', range.from)
  if (range?.to) query.set('to', range.to)

  const suffix = query.size > 0 ? `?${query}` : ''
  const { days } = (await (await request(`/api/days${suffix}`)).json()) as { days: DayIndexEntry[] }

  return days
}

export async function fetchDayCard(date: string): Promise<PapImport> {
  return decodeDayPayload(await (await request(`/api/days/${date}`)).arrayBuffer())
}

export async function saveProfile(profile: PatientProfile): Promise<void> {
  await request('/api/profile', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(profile),
  })
}

export async function deleteAllTherapyData(confirmationCode: string): Promise<number> {
  const { removed } = (await (
    await request('/api/imports', { method: 'DELETE', headers: { [CONFIRMATION_HEADER]: confirmationCode } })
  ).json()) as { removed: number }

  return removed
}

/** The token comes back once, because only its hash is stored. */
export async function createShareLink(minutes: ShareDurationMinutes): Promise<{ id: string; token: string }> {
  return (await (
    await request('/api/shares', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ minutes }),
    })
  ).json()) as { id: string; token: string }
}

export async function revokeShareLink(id: string): Promise<void> {
  await request(`/api/shares/${id}`, { method: 'DELETE' })
}

export async function leaveSharedView(): Promise<void> {
  await request('/api/share-view', { method: 'DELETE' })
}

export async function enterDemoMode(): Promise<void> {
  await request('/api/demo', { method: 'POST' })
}

export async function leaveDemoMode(): Promise<void> {
  await request('/api/demo', { method: 'DELETE' })
}

export interface UploadProgress {
  sent: number
  total: number
}

export interface CommitProgress {
  committed: number
  total: number
}

export type UploadOutcome = { status: 'committed'; dates: string[] } | { status: 'failed'; code: string }

const COMMIT_ATTEMPTS = 3

/** Verdicts about the card itself. Retrying one only makes the reader wait for the same answer. */
const FINAL_COMMIT_ERRORS: (string | undefined)[] = ['unsupportedCard', 'emptyCard']

/**
 * Drives the commit to completion. Every slice is idempotent, so a blip is retried rather than
 * throwing away an upload that may have taken minutes.
 */
export async function commitUpload(
  importId: string,
  onProgress?: (progress: CommitProgress) => void,
): Promise<string[]> {
  const dates: string[] = []

  for (;;) {
    let slice: { done: boolean; committed: string[]; remaining: number } | null = null
    let failure: unknown = null

    for (let attempt = 0; attempt < COMMIT_ATTEMPTS && slice === null; attempt += 1) {
      try {
        slice = (await (await request(`/api/imports/${importId}/commit`, { method: 'POST' })).json()) as {
          done: boolean
          committed: string[]
          remaining: number
        }
      } catch (error) {
        failure = error
        if (error instanceof TherapyApiError && FINAL_COMMIT_ERRORS.includes(error.code)) throw error
      }
    }

    if (!slice) throw failure

    dates.push(...slice.committed)
    onProgress?.({ committed: dates.length, total: dates.length + slice.remaining })

    if (slice.done) return dates
  }
}

/**
 * One request's worth of card at a time. A file that fits is sent whole, as a single chunk at offset
 * zero; a file larger than one request is cut, because the platform drops an oversize body before the
 * handler sees it and the server has no way to ask for the rest.
 */
export function batchForUpload(files: PapFile[], budgetBytes: number): PapFileChunk[][] {
  const batches: PapFileChunk[][] = []
  let current: PapFileChunk[] = []
  let size = 0

  const flush = () => {
    if (current.length === 0) return
    batches.push(current)
    current = []
    size = 0
  }

  for (const file of files) {
    if (file.data.byteLength <= budgetBytes) {
      if (current.length > 0 && size + file.data.byteLength > budgetBytes) flush()
      current.push({ path: file.path, offset: 0, data: file.data })
      size += file.data.byteLength
      continue
    }

    flush()
    for (let offset = 0; offset < file.data.byteLength; offset += budgetBytes) {
      batches.push([{ path: file.path, offset, data: file.data.slice(offset, offset + budgetBytes) }])
    }
  }

  flush()

  return batches
}

export async function uploadCard(
  files: PapFile[],
  onProgress?: (progress: UploadProgress) => void,
  onCommitProgress?: (progress: CommitProgress) => void,
): Promise<UploadOutcome> {
  if (files.length === 0) return { status: 'failed', code: 'unsupportedCard' }

  let importId: string
  try {
    const opened = (await (await request('/api/imports', { method: 'POST' })).json()) as { id: string }
    importId = opened.id
  } catch (error) {
    return { status: 'failed', code: error instanceof TherapyApiError ? error.code : 'unknown' }
  }

  const batches = batchForUpload(files, UPLOAD_BATCH_BUDGET_BYTES)
  const lengths = new Map(files.map((file) => [file.path, file.data.byteLength]))
  let sent = 0

  try {
    for (const batch of batches) {
      const body = encodePapBundle(batch)
      await request(`/api/imports/${importId}/files`, {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: body as BodyInit,
      })
      sent += batch.filter((chunk) => chunk.offset + chunk.data.byteLength === lengths.get(chunk.path)).length
      onProgress?.({ sent, total: files.length })
    }

    return { status: 'committed', dates: await commitUpload(importId, onCommitProgress) }
  } catch (error) {
    await fetch(`/api/imports/${importId}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined)

    return { status: 'failed', code: error instanceof TherapyApiError ? error.code : 'unknown' }
  }
}
