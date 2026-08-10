// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { user } from './schema'

const LOCAL_CONNECTION_STRING = 'postgres://papsee:papsee@127.0.0.1:5432/papsee'

async function importDb() {
  vi.resetModules()
  return import('./index')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the database client', () => {
  it('imports without a connection string, because next build loads every route module to collect page data', async () => {
    vi.stubEnv('DATABASE_URL', '')

    const { db } = await importDb()

    expect(db).toBeDefined()
  })

  it('names the missing connection string on first use rather than swallowing it', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { db } = await importDb()

    expect(() => db.select()).toThrowError(
      'DATABASE_URL is not set. Copy .env.example to .env.local and point it at a local Postgres.',
    )
  })

  it('builds a query once a connection string is present', async () => {
    vi.stubEnv('DATABASE_URL', LOCAL_CONNECTION_STRING)
    const { db } = await importDb()

    try {
      const { sql } = db.select({ id: user.id }).from(user).toSQL()

      expect(sql).toBe('select "id" from "user"')
    } finally {
      await db.$client.end()
    }
  })
})
