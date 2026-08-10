import { drizzle } from 'drizzle-orm/node-postgres'
import * as authSchema from './schema'
import * as papSchema from './pap-schema'

type Database = ReturnType<typeof connect>

function connect() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and point it at a local Postgres.')
  }

  return drizzle(connectionString, { schema: { ...authSchema, ...papSchema } })
}

let connection: Database | undefined

// next build imports every route module to collect page data, so building the client at module scope
// made a connection string a requirement of the build itself on every host, not just of running.
export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    connection ??= connect()
    const value = Reflect.get(connection, property)
    return typeof value === 'function' ? value.bind(connection) : value
  },
})
