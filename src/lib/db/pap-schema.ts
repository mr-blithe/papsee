import {
  bigint,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { CardBrand, ChannelId, DaySettings, DaySummary, DeviceInfo, PapEventType, SettingGroup } from '@/lib/pap'
import type { ContractType } from '@/lib/contracts'
import type { Locale } from '@/i18n/routing'
import type { SessionBounds } from '@/lib/therapy/day-index'
import { user } from './schema'

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' })

export const contract = pgTable(
  'contract',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').$type<ContractType>().notNull(),
    locale: text('locale').$type<Locale>().notNull(),
    version: text('version').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    contentHtml: text('content_html').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('contract_type_locale_version_idx').on(table.type, table.locale, table.version),
    index('contract_published_idx').on(table.type, table.locale, table.publishedAt),
  ],
)

export const patientProfile = pgTable('patient_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  bornOn: text('born_on'),
  heightCm: integer('height_cm'),
  weightKg: real('weight_kg'),
  diagnosedOn: text('diagnosed_on'),
  diagnosisAhi: real('diagnosis_ahi'),
  deviceGuide: text('device_guide'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const therapyShare = pgTable(
  'therapy_share',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Only the SHA-256 of the link is here. See share-token.server.ts.
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('therapy_share_token_idx').on(table.tokenHash),
    index('therapy_share_user_idx').on(table.userId),
  ],
)

export const bannedIp = pgTable(
  'banned_ip',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ip: text('ip').notNull(),
    reason: text('reason'),
    // Not cascade, unlike every other reference to user in this file: a ban has to outlive the
    // admin who placed it, or deleting an account would quietly lift every address it ever banned.
    bannedBy: text('banned_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('banned_ip_ip_idx').on(table.ip)],
)

export const papImport = pgTable(
  'pap_import',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    brand: text('brand').$type<CardBrand>(),
    device: jsonb('device').$type<DeviceInfo>(),
    settingGroups: jsonb('setting_groups').$type<SettingGroup[]>().notNull().default([]),
    unreadable: text('unreadable').array().notNull().default([]),
    fileCount: integer('file_count').notNull().default(0),
    committedAt: timestamp('committed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('pap_import_user_idx').on(table.userId)],
)

export const papDay = pgTable(
  'pap_day',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    importId: uuid('import_id')
      .notNull()
      .references(() => papImport.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    startMs: bigint('start_ms', { mode: 'number' }).notNull(),
    endMs: bigint('end_ms', { mode: 'number' }).notNull(),
    usageMinutes: real('usage_minutes').notNull(),
    ahi: real('ahi').notNull(),
    oai: real('oai').notNull().default(0),
    cai: real('cai').notNull().default(0),
    hi: real('hi').notNull().default(0),
    reraIndex: real('rera_index').notNull().default(0),
    leakP95: real('leak_p95'),
    pressureP95: real('pressure_p95'),
    summary: jsonb('summary').$type<DaySummary>(),
    settings: jsonb('settings').$type<DaySettings>(),
    sessionBounds: jsonb('session_bounds').$type<SessionBounds[]>().notNull(),
    filledAt: timestamp('filled_at'),
  },
  (table) => [
    uniqueIndex('pap_day_user_date_idx').on(table.userId, table.date),
    index('pap_day_import_idx').on(table.importId),
  ],
)

export const papChannel = pgTable(
  'pap_channel',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    dayId: uuid('day_id')
      .notNull()
      .references(() => papDay.id, { onDelete: 'cascade' }),
    sessionIndex: integer('session_index').notNull(),
    channelId: text('channel_id').$type<ChannelId>().notNull(),
    startMs: bigint('start_ms', { mode: 'number' }).notNull(),
    intervalMs: doublePrecision('interval_ms').notNull(),
    unit: text('unit').notNull(),
    scale: doublePrecision('scale').notNull(),
    offset: doublePrecision('offset').notNull(),
    samples: bytea('samples').notNull(),
  },
  (table) => [
    uniqueIndex('pap_channel_day_session_channel_idx').on(table.dayId, table.sessionIndex, table.channelId),
    index('pap_channel_day_idx').on(table.dayId),
  ],
)

export const papEvent = pgTable(
  'pap_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    dayId: uuid('day_id')
      .notNull()
      .references(() => papDay.id, { onDelete: 'cascade' }),
    sessionIndex: integer('session_index').notNull().default(0),
    type: text('type').$type<PapEventType>().notNull(),
    startMs: bigint('start_ms', { mode: 'number' }).notNull(),
    durationMs: integer('duration_ms').notNull(),
  },
  (table) => [index('pap_event_day_idx').on(table.dayId)],
)

export const papFile = pgTable(
  'pap_file',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    importId: uuid('import_id')
      .notNull()
      .references(() => papImport.id, { onDelete: 'cascade' }),
    dayId: uuid('day_id').references(() => papDay.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    bytes: bytea('bytes').notNull(),
  },
  (table) => [
    uniqueIndex('pap_file_import_path_idx').on(table.importId, table.path),
    index('pap_file_day_idx').on(table.dayId),
  ],
)
