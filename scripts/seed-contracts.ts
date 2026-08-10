import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import { CONTRACT_SEEDS } from '../src/lib/contract-seeds'
import { contract } from '../src/lib/db/pap-schema'

if (existsSync('.env.local')) loadEnvFile('.env.local')

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed contracts.')
}

async function seedContracts() {
  const client = new Client({ connectionString })
  const database = drizzle(client)

  await client.connect()

  try {
    for (const seed of CONTRACT_SEEDS) {
      await database
        .insert(contract)
        .values(seed)
        .onConflictDoUpdate({
          target: [contract.type, contract.locale, contract.version],
          set: {
            title: seed.title,
            summary: seed.summary,
            contentHtml: seed.contentHtml,
            publishedAt: seed.publishedAt,
          },
        })
    }
  } finally {
    await client.end()
  }
}

seedContracts().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
