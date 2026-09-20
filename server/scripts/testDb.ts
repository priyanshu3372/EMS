import { spawnSync } from 'node:child_process'
import dotenv from 'dotenv'

/**
 * Runs a Prisma command against the TEST database instead of the development
 * one.
 *
 *   npm run db:test -- migrate deploy     apply migrations to local Postgres
 *   npm run db:test -- migrate reset      wipe and rebuild it
 *   npm run db:test -- studio             browse it
 *
 * Prisma reads .env and has no flag for "use a different env file", so this
 * loads .env.test over the top and hands the result to the CLI. Without it the
 * only way to migrate the test database would be to edit .env back and forth,
 * which is exactly how someone eventually runs a reset against Neon.
 */
dotenv.config()
const overlay = dotenv.config({ path: '.env.test', override: true })

if (overlay.error) {
  console.error('\n  .env.test not found. Copy .env.test.example and fill it in.\n')
  process.exit(1)
}

const url = process.env.DATABASE_URL ?? ''
if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
  console.error('\n  Refusing to run: .env.test does not point at a local database.\n')
  console.error(`  DATABASE_URL host is not localhost.\n`)
  process.exit(1)
}

const result = spawnSync('npx', ['prisma', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
})

process.exit(result.status ?? 1)
