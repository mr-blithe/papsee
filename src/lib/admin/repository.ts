import { desc, eq, ilike, isNotNull, sql, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bannedIp, papDay, papImport } from '@/lib/db/pap-schema'
import { session, user } from '@/lib/db/schema'
import { ADMIN_ROLE, DEFAULT_ROLE } from './roles'
import { ADMIN_PAGE_SIZE, pageOffset } from './pagination'

const SESSION_PAGE_SIZE = 20

export interface AdminTotals {
  users: number
  verified: number
  banned: number
  admins: number
  usersWithData: number
  imports: number
  nights: number
}

export async function readTotals(): Promise<AdminTotals> {
  const [accounts] = await db
    .select({
      users: sql<number>`count(*)::int`,
      verified: sql<number>`count(*) filter (where ${user.emailVerified})::int`,
      banned: sql<number>`count(*) filter (where ${user.banned})::int`,
      admins: sql<number>`count(*) filter (where ${ADMIN_ROLE} = any(string_to_array(coalesce(${user.role}, ${DEFAULT_ROLE}), ',')))::int`,
    })
    .from(user)

  // An import counts once it is committed, which is the same rule the panel reads by. An abandoned
  // upload is not data, and counting it would disagree with the nights sitting beside it.
  const [imports] = await db
    .select({
      imports: sql<number>`count(*)::int`,
      usersWithData: sql<number>`count(distinct ${papImport.userId})::int`,
    })
    .from(papImport)
    .where(isNotNull(papImport.committedAt))

  const [nights] = await db
    .select({ nights: sql<number>`count(*)::int` })
    .from(papDay)
    .where(isNotNull(papDay.filledAt))

  return {
    users: accounts?.users ?? 0,
    verified: accounts?.verified ?? 0,
    banned: accounts?.banned ?? 0,
    admins: accounts?.admins ?? 0,
    usersWithData: imports?.usersWithData ?? 0,
    imports: imports?.imports ?? 0,
    nights: nights?.nights ?? 0,
  }
}

export interface AdminUserRow {
  id: string
  email: string
  name: string
  createdAt: Date
  emailVerified: boolean
  banned: boolean
  banReason: string | null
  banExpires: Date | null
  role: string
  imports: number
  nights: number
  lastUploadAt: Date | null
}

function userRows(where: SQL | undefined, limit: number, offset: number) {
  const imports = db
    .select({
      userId: papImport.userId,
      imports: sql<number>`count(*)::int`.as('imports'),
      lastUploadAt: sql<Date | null>`max(${papImport.committedAt})`.as('last_upload_at'),
    })
    .from(papImport)
    .where(isNotNull(papImport.committedAt))
    .groupBy(papImport.userId)
    .as('imports')

  const nights = db
    .select({
      userId: papDay.userId,
      nights: sql<number>`count(*)::int`.as('nights'),
    })
    .from(papDay)
    .where(isNotNull(papDay.filledAt))
    .groupBy(papDay.userId)
    .as('nights')

  return db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      banned: sql<boolean>`coalesce(${user.banned}, false)`,
      banReason: user.banReason,
      banExpires: user.banExpires,
      role: sql<string>`coalesce(${user.role}, ${DEFAULT_ROLE})`,
      imports: sql<number>`coalesce(${imports.imports}, 0)`,
      nights: sql<number>`coalesce(${nights.nights}, 0)`,
      lastUploadAt: imports.lastUploadAt,
    })
    .from(user)
    .leftJoin(imports, eq(imports.userId, user.id))
    .leftJoin(nights, eq(nights.userId, user.id))
    .where(where)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset(offset)
}

function searchFilter(search: string): SQL | undefined {
  return search ? ilike(user.email, `%${search}%`) : undefined
}

export interface AdminUserPage {
  rows: AdminUserRow[]
  total: number
}

export async function listAdminUsers(search: string, page: number): Promise<AdminUserPage> {
  const where = searchFilter(search)

  const [rows, [counted]] = await Promise.all([
    userRows(where, ADMIN_PAGE_SIZE, pageOffset(page)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(user)
      .where(where),
  ])

  return { rows, total: counted?.total ?? 0 }
}

export async function readAdminUser(userId: string): Promise<AdminUserRow | null> {
  const [row] = await userRows(eq(user.id, userId), 1, 0)

  return row ?? null
}

export interface AdminSessionRow {
  id: string
  createdAt: Date
  expiresAt: Date
  ipAddress: string | null
  userAgent: string | null
  impersonatedBy: string | null
}

export async function listUserSessions(userId: string): Promise<AdminSessionRow[]> {
  return db
    .select({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      impersonatedBy: session.impersonatedBy,
    })
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(desc(session.createdAt))
    .limit(SESSION_PAGE_SIZE)
}

export interface BannedIpRow {
  id: string
  ip: string
  reason: string | null
  bannedBy: string | null
  createdAt: Date
}

export async function isIpBanned(ip: string): Promise<boolean> {
  const [row] = await db.select({ id: bannedIp.id }).from(bannedIp).where(eq(bannedIp.ip, ip)).limit(1)

  return row !== undefined
}

export async function listBannedIps(): Promise<BannedIpRow[]> {
  return db
    .select({
      id: bannedIp.id,
      ip: bannedIp.ip,
      reason: bannedIp.reason,
      bannedBy: user.email,
      createdAt: bannedIp.createdAt,
    })
    .from(bannedIp)
    .leftJoin(user, eq(user.id, bannedIp.bannedBy))
    .orderBy(desc(bannedIp.createdAt))
}

export interface IpBanOutcome {
  id: string
  revokedSessions: number
}

export async function banIp(ip: string, reason: string | null, bannedBy: string): Promise<IpBanOutcome> {
  const [inserted] = await db
    .insert(bannedIp)
    .values({ ip, reason, bannedBy })
    .onConflictDoNothing({ target: bannedIp.ip })
    .returning({ id: bannedIp.id })

  const [existing] = inserted
    ? []
    : await db.select({ id: bannedIp.id }).from(bannedIp).where(eq(bannedIp.ip, ip)).limit(1)

  // Refusing the next sign in is not enough on its own: whoever is already signed in from this
  // address would otherwise keep the session they had when the ban was placed.
  const revoked = await db.delete(session).where(eq(session.ipAddress, ip)).returning({ id: session.id })

  return { id: inserted?.id ?? existing?.id ?? '', revokedSessions: revoked.length }
}

export async function unbanIp(id: string): Promise<boolean> {
  const removed = await db.delete(bannedIp).where(eq(bannedIp.id, id)).returning({ id: bannedIp.id })

  return removed.length > 0
}

export async function countBannedIps(): Promise<number> {
  const [row] = await db.select({ addresses: sql<number>`count(*)::int` }).from(bannedIp)

  return row?.addresses ?? 0
}
