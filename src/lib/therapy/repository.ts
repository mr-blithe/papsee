import { and, asc, desc, eq, gte, isNotNull, lt, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { papChannel, papDay, papEvent, papFile, papImport, patientProfile, therapyShare } from '@/lib/db/pap-schema'
import type { CardBrand, ChannelId, DaySettings, DaySummary, DeviceInfo, PapEventType, SettingGroup } from '@/lib/pap'
import type { PapFileChunk } from '@/lib/pap/bundle'
import type { SessionBounds } from './day-index'
import { isShareActive, type ShareLink } from './shares'

export interface DayIndexEntry {
  date: string
  startMs: number
  endMs: number
  usageMinutes: number
  ahi: number
  oai: number
  cai: number
  hi: number
  reraIndex: number
  leakP95: number | null
  pressureP95: number | null
  sessionCount: number
}

export interface PatientProfile {
  bornOn: string | null
  heightCm: number | null
  weightKg: number | null
  diagnosedOn: string | null
  diagnosisAhi: number | null
  deviceGuide: string | null
}

async function findOpenImport(userId: string, importId: string): Promise<boolean> {
  const [row] = await db
    .select({ committedAt: papImport.committedAt })
    .from(papImport)
    .where(and(eq(papImport.id, importId), eq(papImport.userId, userId)))

  return row !== undefined && row.committedAt === null
}

export async function createImport(userId: string): Promise<string> {
  const [row] = await db.insert(papImport).values({ userId }).returning({ id: papImport.id })
  return row.id
}

export type StoreFilesOutcome = 'stored' | 'notOpen' | 'outOfOrder'

/**
 * One batch of card bytes. A chunk at offset zero replaces whatever the path held; a later chunk is
 * appended, and only onto bytes that are exactly as long as the chunk claims to follow. That length
 * check is what makes the append provable: a duplicated or reordered chunk matches no row instead of
 * corrupting the file.
 */
export async function storeImportFiles(
  userId: string,
  importId: string,
  chunks: PapFileChunk[],
): Promise<StoreFilesOutcome> {
  if (!(await findOpenImport(userId, importId))) return 'notOpen'
  if (chunks.length === 0) return 'stored'

  const opening = chunks.filter((chunk) => chunk.offset === 0)
  const continuations = chunks.filter((chunk) => chunk.offset > 0)

  if (opening.length > 0) {
    await db
      .insert(papFile)
      .values(
        opening.map((chunk) => ({
          userId,
          importId,
          path: chunk.path,
          bytes: Buffer.from(new Uint8Array(chunk.data)),
        })),
      )
      .onConflictDoUpdate({
        target: [papFile.importId, papFile.path],
        set: { bytes: sql`excluded.bytes` },
      })
  }

  for (const chunk of continuations) {
    const appended = await db
      .update(papFile)
      .set({ bytes: sql`${papFile.bytes} || ${Buffer.from(new Uint8Array(chunk.data))}` })
      .where(
        and(
          eq(papFile.importId, importId),
          eq(papFile.path, chunk.path),
          sql`octet_length(${papFile.bytes}) = ${chunk.offset}`,
        ),
      )
      .returning({ id: papFile.id })

    if (appended.length === 0) return 'outOfOrder'
  }

  return 'stored'
}

export async function deleteImport(userId: string, importId: string): Promise<boolean> {
  const deleted = await db
    .delete(papImport)
    .where(and(eq(papImport.id, importId), eq(papImport.userId, userId)))
    .returning({ id: papImport.id })

  return deleted.length > 0
}

export async function listDays(userId: string, from: string | null, to: string | null): Promise<DayIndexEntry[]> {
  const rows = await db
    .select({
      date: papDay.date,
      startMs: papDay.startMs,
      endMs: papDay.endMs,
      usageMinutes: papDay.usageMinutes,
      ahi: papDay.ahi,
      oai: papDay.oai,
      cai: papDay.cai,
      hi: papDay.hi,
      reraIndex: papDay.reraIndex,
      leakP95: papDay.leakP95,
      pressureP95: papDay.pressureP95,
      sessionBounds: papDay.sessionBounds,
    })
    .from(papDay)
    .where(
      and(
        eq(papDay.userId, userId),
        // A night is seeded before it is parsed. For a card with no summary of its own that row is an
        // epoch dated blank until `fillDay` reaches it, so an abandoned or in-flight commit would put a
        // strip of 1970 nights in front of the reader, and in front of anyone holding a share link.
        isNotNull(papDay.filledAt),
        from ? gte(papDay.date, from) : undefined,
        to ? lte(papDay.date, to) : undefined,
      ),
    )
    .orderBy(asc(papDay.date))

  return rows.map(({ sessionBounds, ...row }) => ({ ...row, sessionCount: (sessionBounds as SessionBounds[]).length }))
}

export async function countDays(userId: string): Promise<number> {
  const [row] = await db
    .select({ days: sql<number>`count(*)::int` })
    .from(papDay)
    .where(eq(papDay.userId, userId))

  return row?.days ?? 0
}

export interface StoredChannel {
  id: string
  sessionIndex: number
  channelId: ChannelId
  startMs: number
  intervalMs: number
  unit: string
  scale: number
  offset: number
  length: number
}

export interface StoredDay {
  id: string
  date: string
  startMs: number
  endMs: number
  summary: DaySummary | null
  settings: DaySettings | null
  sessionBounds: SessionBounds[]
  brand: CardBrand | null
  device: DeviceInfo | null
  settingGroups: SettingGroup[]
  unreadable: string[]
  events: { sessionIndex: number; type: PapEventType; startMs: number; durationMs: number }[]
  channels: StoredChannel[]
}

export async function readStoredDay(userId: string, date: string): Promise<StoredDay | null> {
  const [day] = await db
    .select({
      id: papDay.id,
      date: papDay.date,
      startMs: papDay.startMs,
      endMs: papDay.endMs,
      summary: papDay.summary,
      settings: papDay.settings,
      sessionBounds: papDay.sessionBounds,
      brand: papImport.brand,
      device: papImport.device,
      settingGroups: papImport.settingGroups,
      unreadable: papImport.unreadable,
    })
    .from(papDay)
    .innerJoin(papImport, eq(papImport.id, papDay.importId))
    .where(and(eq(papDay.userId, userId), eq(papDay.date, date)))

  if (!day) return null

  const [events, channels] = await Promise.all([
    db
      .select({
        sessionIndex: papEvent.sessionIndex,
        type: papEvent.type,
        startMs: papEvent.startMs,
        durationMs: papEvent.durationMs,
      })
      .from(papEvent)
      .where(eq(papEvent.dayId, day.id))
      .orderBy(asc(papEvent.startMs)),
    db
      .select({
        id: papChannel.id,
        sessionIndex: papChannel.sessionIndex,
        channelId: papChannel.channelId,
        startMs: papChannel.startMs,
        intervalMs: papChannel.intervalMs,
        unit: papChannel.unit,
        scale: papChannel.scale,
        offset: papChannel.offset,
        length: sql<number>`octet_length(${papChannel.samples})::int`,
      })
      .from(papChannel)
      .where(eq(papChannel.dayId, day.id))
      .orderBy(asc(papChannel.sessionIndex), asc(papChannel.channelId)),
  ])

  return { ...day, events, channels }
}

/**
 * Every waveform block of one night, in one round trip. Read separately from `readStoredDay` so a
 * conditional request that answers `304` never pulls the megabytes it is not going to send.
 */
export async function readDayChannelSamples(userId: string, dayId: string): Promise<Map<string, Uint8Array>> {
  const rows = await db
    .select({ id: papChannel.id, samples: papChannel.samples })
    .from(papChannel)
    .where(and(eq(papChannel.dayId, dayId), eq(papChannel.userId, userId)))

  return new Map(rows.map((row) => [row.id, new Uint8Array(row.samples)]))
}

export interface ExportedDay extends DayIndexEntry {
  summary: DaySummary | null
  settings: DaySettings | null
  sessionBounds: SessionBounds[]
  events: { type: PapEventType; startMs: number; durationMs: number }[]
}

export async function listDaysForExport(userId: string): Promise<ExportedDay[]> {
  const days = await db.select().from(papDay).where(eq(papDay.userId, userId)).orderBy(asc(papDay.date))

  if (days.length === 0) return []

  const events = await db
    .select({ dayId: papEvent.dayId, type: papEvent.type, startMs: papEvent.startMs, durationMs: papEvent.durationMs })
    .from(papEvent)
    .where(eq(papEvent.userId, userId))
    .orderBy(asc(papEvent.startMs))

  const byDay = new Map<string, { type: PapEventType; startMs: number; durationMs: number }[]>()
  for (const { dayId, ...event } of events) {
    const bucket = byDay.get(dayId)
    if (bucket) bucket.push(event)
    else byDay.set(dayId, [event])
  }

  return days.map((day) => ({
    date: day.date,
    startMs: day.startMs,
    endMs: day.endMs,
    usageMinutes: day.usageMinutes,
    ahi: day.ahi,
    oai: day.oai,
    cai: day.cai,
    hi: day.hi,
    reraIndex: day.reraIndex,
    leakP95: day.leakP95,
    pressureP95: day.pressureP95,
    sessionCount: day.sessionBounds.length,
    summary: day.summary,
    settings: day.settings,
    sessionBounds: day.sessionBounds,
    events: byDay.get(day.id) ?? [],
  }))
}

export interface ExportedImport {
  id: string
  brand: CardBrand | null
  device: DeviceInfo | null
  settingGroups: SettingGroup[]
  fileCount: number
  committedAt: Date | null
  createdAt: Date
}

export async function listImportsForExport(userId: string): Promise<ExportedImport[]> {
  return db
    .select({
      id: papImport.id,
      brand: papImport.brand,
      device: papImport.device,
      settingGroups: papImport.settingGroups,
      fileCount: papImport.fileCount,
      committedAt: papImport.committedAt,
      createdAt: papImport.createdAt,
    })
    .from(papImport)
    .where(eq(papImport.userId, userId))
    .orderBy(asc(papImport.createdAt))
}

export async function deleteAllTherapyData(userId: string): Promise<number> {
  const removed = await db.delete(papImport).where(eq(papImport.userId, userId)).returning({ id: papImport.id })

  return removed.length
}

export async function createShare(userId: string, tokenHash: string, expiresAt: Date): Promise<string> {
  const [row] = await db
    .insert(therapyShare)
    .values({ userId, tokenHash, expiresAt })
    .returning({ id: therapyShare.id })

  return row.id
}

/**
 * The links that still open something, newest first. Expiry is compared here rather than in SQL so
 * `isShareActive` stays the one place that rule lives.
 */
export async function listActiveShares(userId: string): Promise<ShareLink[]> {
  const rows = await db
    .select({ id: therapyShare.id, expiresAt: therapyShare.expiresAt })
    .from(therapyShare)
    .where(eq(therapyShare.userId, userId))
    .orderBy(desc(therapyShare.createdAt))

  const nowMs = Date.now()

  return rows.filter((row) => isShareActive(row, nowMs))
}

export async function deleteShare(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(therapyShare)
    .where(and(eq(therapyShare.id, id), eq(therapyShare.userId, userId)))
    .returning({ id: therapyShare.id })

  return deleted.length > 0
}

export async function deleteExpiredShares(userId: string, before: Date): Promise<void> {
  await db.delete(therapyShare).where(and(eq(therapyShare.userId, userId), lt(therapyShare.expiresAt, before)))
}

/**
 * The owner behind a link, expiry included so the caller decides whether it still opens anything.
 * Reading it here rather than filtering in SQL keeps that one rule in `isShareActive`.
 */
export async function findShareByTokenHash(tokenHash: string): Promise<{ userId: string; expiresAt: Date } | null> {
  const [row] = await db
    .select({ userId: therapyShare.userId, expiresAt: therapyShare.expiresAt })
    .from(therapyShare)
    .where(eq(therapyShare.tokenHash, tokenHash))

  return row ?? null
}

export async function getProfile(userId: string): Promise<PatientProfile | null> {
  const [row] = await db
    .select({
      bornOn: patientProfile.bornOn,
      heightCm: patientProfile.heightCm,
      weightKg: patientProfile.weightKg,
      diagnosedOn: patientProfile.diagnosedOn,
      diagnosisAhi: patientProfile.diagnosisAhi,
      deviceGuide: patientProfile.deviceGuide,
    })
    .from(patientProfile)
    .where(eq(patientProfile.userId, userId))

  return row ?? null
}

export async function saveProfile(userId: string, input: PatientProfile): Promise<void> {
  await db
    .insert(patientProfile)
    .values({ userId, ...input })
    .onConflictDoUpdate({ target: patientProfile.userId, set: input })
}
