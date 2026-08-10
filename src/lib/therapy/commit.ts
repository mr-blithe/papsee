import { and, asc, eq, inArray, isNotNull, isNull, ne, notExists, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { papChannel, papDay, papEvent, papFile, papImport } from '@/lib/db/pap-schema'
import {
  buildDigitalDay,
  detectCard,
  loaderFor,
  readCardMetadata,
  toPapDay,
  type CardBrand,
  type CardDaySummary,
  type CardFileHead,
  type PapFile,
} from '@/lib/pap'
import { toDayIndexRow } from './day-index'

const EMPTY_HEAD = new Uint8Array(0)

export type CommitProgress =
  | { status: 'progress'; committed: string[]; remaining: number; done: boolean; unreadable: string[] }
  | { status: 'unsupported'; brand: CardBrand | null }
  | { status: 'empty' }
  | { status: 'notFound' }

function toPapFile(row: { path: string; bytes: Buffer }): PapFile {
  return {
    path: row.path,
    data: row.bytes.buffer.slice(row.bytes.byteOffset, row.bytes.byteOffset + row.bytes.byteLength) as ArrayBuffer,
  }
}

/**
 * The opening bytes of every file that might belong to a night, in one query rather than one per file,
 * because this runs before the commit's time budget starts and a card can hold a year of them. A brand
 * that dates a card from its paths asks for nothing, and then no bytes are read here at all.
 *
 * Postgres can only serve `substring` without fetching the whole value when the stored datum is
 * uncompressed, which sample data usually is because it compresses poorly. That is a saving, not a
 * guarantee.
 */
async function readHeads(
  userId: string,
  importId: string,
  paths: string[],
  headBytes: number,
): Promise<CardFileHead[]> {
  if (headBytes === 0) return paths.map((path) => ({ path, head: EMPTY_HEAD }))
  if (paths.length === 0) return []

  const rows = await db
    .select({ path: papFile.path, head: sql<Buffer>`substring(${papFile.bytes} from 1 for ${headBytes})` })
    .from(papFile)
    .where(and(eq(papFile.importId, importId), eq(papFile.userId, userId), inArray(papFile.path, paths)))

  return rows.map((row) => ({ path: row.path, head: new Uint8Array(row.head) }))
}

async function readFiles(userId: string, importId: string, paths: string[]): Promise<PapFile[]> {
  if (paths.length === 0) return []

  const rows = await db
    .select({ path: papFile.path, bytes: papFile.bytes })
    .from(papFile)
    .where(and(eq(papFile.importId, importId), eq(papFile.userId, userId), inArray(papFile.path, paths)))

  return rows.map(toPapFile)
}

/**
 * Opens the commit: reads the card level files only, parses the summary block once, and writes one
 * summary row per night. Every date the card covers is replaced here, atomically, before a single
 * waveform is stored, so an abandoned commit still leaves exactly one row per night.
 */
async function beginCommit(userId: string, importId: string): Promise<CommitProgress> {
  const paths = await db
    .select({ path: papFile.path })
    .from(papFile)
    .where(and(eq(papFile.importId, importId), eq(papFile.userId, userId)))

  const cardPaths = paths.map((row) => row.path)
  const brand = detectCard(cardPaths)
  const loader = loaderFor(brand)

  if (!loader) {
    await db.delete(papImport).where(and(eq(papImport.id, importId), eq(papImport.userId, userId)))
    return { status: 'unsupported', brand }
  }

  const cardLevel = await readFiles(
    userId,
    importId,
    cardPaths.filter((path) => loader.isCardLevel(path)),
  )
  const metadata = readCardMetadata(cardLevel, cardPaths)
  const dayPaths = cardPaths.filter((path) => !loader.isCardLevel(path))
  const assignment = loader.assignDays(await readHeads(userId, importId, dayPaths, loader.headBytes))

  const datalogDates = new Set<string>()
  for (const date of assignment.values()) if (date) datalogDates.add(date)

  const dates = [...new Set([...datalogDates, ...metadata.daySummaries.map((day) => day.date)])].sort()
  const replaced = [...new Set([...dates, ...metadata.coveredDates])]

  if (dates.length === 0) {
    await db.delete(papImport).where(and(eq(papImport.id, importId), eq(papImport.userId, userId)))

    // A readable card the patient simply never slept with is not an unreadable card, and telling them
    // the brand is unsupported would be a lie they cannot act on.
    return { status: 'empty' }
  }

  const summaries = new Map(metadata.daySummaries.map((day) => [day.date, day]))

  await db.transaction(async (tx) => {
    await tx.delete(papDay).where(and(eq(papDay.userId, userId), inArray(papDay.date, replaced)))

    for (const date of dates) {
      const summary = summaries.get(date) ?? null
      const row = toDayIndexRow(toPapDay(buildDigitalDay(brand, date, [], summary).day))
      const [day] = await tx
        .insert(papDay)
        .values({
          userId,
          importId,
          date,
          startMs: row.startMs,
          endMs: row.endMs,
          usageMinutes: row.usageMinutes,
          ahi: row.ahi,
          oai: row.oai,
          cai: row.cai,
          hi: row.hi,
          reraIndex: row.reraIndex,
          leakP95: row.leakP95,
          pressureP95: row.pressureP95,
          summary: row.summary,
          settings: row.settings,
          sessionBounds: [],
          filledAt: datalogDates.has(date) ? null : new Date(),
        })
        .returning({ id: papDay.id })

      const dayPaths = [...assignment.entries()].filter(([, value]) => value === date).map(([path]) => path)
      if (dayPaths.length > 0) {
        await tx
          .update(papFile)
          .set({ dayId: day.id })
          .where(and(eq(papFile.importId, importId), inArray(papFile.path, dayPaths)))
      }
    }

    const orphaned = [...assignment.entries()]
      .filter(([, date]) => date !== null && !dates.includes(date))
      .map(([path]) => path)
    if (orphaned.length > 0) {
      await tx.delete(papFile).where(and(eq(papFile.importId, importId), inArray(papFile.path, orphaned)))
    }

    await tx
      .update(papImport)
      .set({
        brand: metadata.brand,
        device: metadata.device,
        settingGroups: metadata.settingGroups,
        unreadable: metadata.unreadable,
        fileCount: cardPaths.length - orphaned.length,
      })
      .where(eq(papImport.id, importId))

    // A night that changed hands may have emptied its old import. Sweeping here rather than at the
    // end means an abandoned commit cannot leave a stranger's bytes behind forever.
    await tx.delete(papImport).where(
      and(
        eq(papImport.userId, userId),
        ne(papImport.id, importId),
        isNotNull(papImport.committedAt),
        notExists(
          tx
            .select({ one: sql`1` })
            .from(papDay)
            .where(eq(papDay.importId, papImport.id)),
        ),
      ),
    )
  })

  return {
    status: 'progress',
    committed: [],
    remaining: datalogDates.size,
    done: false,
    unreadable: metadata.unreadable,
  }
}

async function fillDay(
  userId: string,
  importId: string,
  brand: CardBrand | null,
  day: { id: string; date: string },
): Promise<{ unreadable: string[] }> {
  const stored = await db
    .select({ path: papFile.path, bytes: papFile.bytes })
    .from(papFile)
    .where(and(eq(papFile.userId, userId), eq(papFile.dayId, day.id)))

  const [existing] = await db
    .select({ summary: papDay.summary, settings: papDay.settings, noonMs: papDay.startMs })
    .from(papDay)
    .where(eq(papDay.id, day.id))

  const summary: CardDaySummary | null =
    existing?.summary && existing.settings
      ? { date: day.date, noonMs: existing.noonMs, summary: existing.summary, settings: existing.settings }
      : null

  const built = buildDigitalDay(brand, day.date, stored.map(toPapFile), summary)
  const parsed = toPapDay(built.day)
  const row = toDayIndexRow(parsed)

  await db.transaction(async (tx) => {
    await tx
      .update(papDay)
      .set({
        startMs: row.startMs,
        endMs: row.endMs,
        usageMinutes: row.usageMinutes,
        ahi: row.ahi,
        oai: row.oai,
        cai: row.cai,
        hi: row.hi,
        reraIndex: row.reraIndex,
        // A card with no summary of its own only learns its readings once the night is parsed, so they
        // are written here rather than thrown away. Falling back to what is stored keeps this from
        // nulling a summary the card did carry.
        summary: built.day.summary ?? existing?.summary ?? null,
        settings: built.day.settings ?? existing?.settings ?? null,
        leakP95: row.leakP95,
        pressureP95: row.pressureP95,
        sessionBounds: row.sessionBounds,
        filledAt: new Date(),
      })
      .where(eq(papDay.id, day.id))

    await tx.delete(papEvent).where(eq(papEvent.dayId, day.id))
    await tx.delete(papChannel).where(eq(papChannel.dayId, day.id))

    const events = built.day.sessions.flatMap((session, sessionIndex) =>
      session.events.map((event) => ({
        userId,
        dayId: day.id,
        sessionIndex,
        type: event.type,
        startMs: Math.round(event.startMs),
        durationMs: Math.round(event.durationMs),
      })),
    )
    if (events.length > 0) await tx.insert(papEvent).values(events)

    const channels = built.day.sessions.flatMap((session, sessionIndex) =>
      session.channels.map((channel) => ({
        userId,
        dayId: day.id,
        sessionIndex,
        channelId: channel.id,
        startMs: Math.round(channel.startMs),
        intervalMs: channel.intervalMs,
        unit: channel.unit,
        scale: channel.scale,
        offset: channel.offset,
        samples: Buffer.from(channel.samples),
      })),
    )
    if (channels.length > 0) await tx.insert(papChannel).values(channels)

    if (built.unreadable.length > 0) {
      await tx
        .update(papImport)
        .set({ unreadable: sql`array_cat(${papImport.unreadable}, ${built.unreadable})` })
        .where(eq(papImport.id, importId))
    }
  })

  return { unreadable: built.unreadable }
}

async function pendingDays(userId: string, importId: string) {
  return db
    .select({ id: papDay.id, date: papDay.date })
    .from(papDay)
    .where(and(eq(papDay.userId, userId), eq(papDay.importId, importId), isNull(papDay.filledAt)))
    .orderBy(asc(papDay.date))
}

/**
 * One slice of a commit. The client calls this until `done`, so a card holding a year of nights never
 * needs one request large enough to parse all of it at once.
 */
export async function advanceCommit(userId: string, importId: string, budgetMs: number): Promise<CommitProgress> {
  const [open] = await db
    .select({ committedAt: papImport.committedAt, brand: papImport.brand })
    .from(papImport)
    .where(and(eq(papImport.id, importId), eq(papImport.userId, userId)))

  if (!open || open.committedAt !== null) return { status: 'notFound' }

  const [started] = await db
    .select({ one: sql<number>`1` })
    .from(papDay)
    .where(and(eq(papDay.userId, userId), eq(papDay.importId, importId)))
    .limit(1)

  if (!started) {
    const opened = await beginCommit(userId, importId)
    if (opened.status !== 'progress') return opened
  }

  // `beginCommit` is what writes the brand, so it can only be read back once the opening slice has run.
  const [stamped] = await db.select({ brand: papImport.brand }).from(papImport).where(eq(papImport.id, importId))
  const brand = stamped?.brand ?? open.brand

  const startedAt = Date.now()
  const committed: string[] = []
  const unreadable: string[] = []

  // Always fill at least one night before looking at the budget. A night slower than the whole
  // budget would otherwise return no progress every time and the client would loop forever.
  let pending = await pendingDays(userId, importId)
  while (pending.length > 0) {
    const day = pending[0]
    const filled = await fillDay(userId, importId, brand, day)
    committed.push(day.date)
    unreadable.push(...filled.unreadable)
    pending = pending.slice(1)

    if (Date.now() - startedAt >= budgetMs) break
  }

  const remaining = pending.length

  if (remaining === 0) {
    await db.update(papImport).set({ committedAt: new Date() }).where(eq(papImport.id, importId))
  }

  return { status: 'progress', committed, remaining, done: remaining === 0, unreadable }
}
