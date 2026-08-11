import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import { ADMIN_ROLE } from '../src/lib/admin/roles'
import { user } from '../src/lib/db/schema'

if (existsSync('.env.local')) loadEnvFile('.env.local')

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to promote an admin.')
}

// pnpm hands the separator to the script rather than consuming it, so both
// `pnpm db:promote-admin someone@example.com` and the `--` form have to arrive here the same way.
const email = process.argv.slice(2).find((argument) => argument !== '--')

async function promoteAdmin() {
  if (!email) {
    throw new Error('Usage: pnpm db:promote-admin someone@example.com')
  }

  const client = new Client({ connectionString })
  const database = drizzle(client)

  await client.connect()

  try {
    const promoted = await database
      .update(user)
      .set({ role: ADMIN_ROLE })
      .where(sql`lower(${user.email}) = lower(${email})`)
      .returning({ email: user.email })

    const account = promoted[0]
    if (!account) {
      throw new Error(`No account is registered with ${email}.`)
    }

    console.log(`${account.email} is now an admin.`)
  } finally {
    await client.end()
  }
}

promoteAdmin().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
