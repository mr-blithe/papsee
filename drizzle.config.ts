import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

const ENV_FILE = '.env.local'

// Knip loads this config to find the schema entry points, and CI has no .env.local. Throwing while
// it loads leaves knip with no entry point for the auth tables and reports every one of them unused.
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)

const url = process.env.DATABASE_URL

if (!url) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and run docker compose up -d.')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./src/lib/db/schema.ts', './src/lib/db/pap-schema.ts'],
  out: './drizzle',
  dbCredentials: { url },
})
