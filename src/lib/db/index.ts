import { drizzle } from 'drizzle-orm/node-postgres'
import * as authSchema from './schema'
import * as papSchema from './pap-schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and point it at a local Postgres.')
}

export const db = drizzle(connectionString, { schema: { ...authSchema, ...papSchema } })
