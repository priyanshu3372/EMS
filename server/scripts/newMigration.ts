import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { logger } from '../src/platform/logger'

/**
 * Writes a migration from the current schema, without ever touching a real
 * database.
 *
 * WHY THIS SCRIPT EXISTS. `prisma migrate dev` refuses to run non-interactively
 * the moment a change is destructive — dropping a column, narrowing a type —
 * which is exactly when you most want a migration. The obvious way around it is
 * `prisma migrate diff --shadow-database-url ...`, and the obvious value to
 * hand that flag is DIRECT_URL, because it is the database URL that is lying
 * right there in `.env`.
 *
 * That wipes the development database. Prisma RESETS a shadow database to
 * replay migrations into it, so naming the dev database as the shadow drops
 * every table and rebuilds them empty. It did, on 25 September 2026, and the
 * whole of ems_dev went with it.
 *
 * So the shadow URL is not a parameter here. It is read from
 * SHADOW_DATABASE_URL, checked against DATABASE_URL and DIRECT_URL, and the
 * script refuses if it matches either. A throwaway local database is the only
 * thing it will accept.
 *
 *   npm run migration:new -- add_something
 */

const name = process.argv[2]

if (!name || !/^[a-z0-9_]+$/.test(name)) {
  logger.error('Usage: npm run migration:new -- snake_case_name')
  process.exit(1)
}

const shadow = process.env.SHADOW_DATABASE_URL
if (!shadow) {
  logger.error('SHADOW_DATABASE_URL is not set. See the note in .env.')
  process.exit(1)
}

/** Compares connection targets, ignoring query strings and the Neon pooler. */
function target(url: string): string {
  const parsed = new URL(url)
  return `${parsed.hostname.replace('-pooler', '')}${parsed.pathname}`
}

for (const [label, url] of [
  ['DATABASE_URL', process.env.DATABASE_URL],
  ['DIRECT_URL', process.env.DIRECT_URL],
] as const) {
  if (url && target(url) === target(shadow)) {
    // The whole reason this file exists.
    logger.error(
      `SHADOW_DATABASE_URL points at the same database as ${label}. ` +
        'Prisma wipes the shadow database — this would destroy it. Refusing.',
    )
    process.exit(1)
  }
}

if (!/localhost|127\.0\.0\.1/.test(new URL(shadow).hostname)) {
  logger.error('SHADOW_DATABASE_URL is not local. Refusing to reset a remote database.')
  process.exit(1)
}

const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const dir = join('prisma', 'schema', 'migrations', `${stamp}_${name}`)

if (existsSync(dir)) {
  logger.error(`${dir} already exists`)
  process.exit(1)
}

const sql = execFileSync(
  'npx',
  [
    'prisma',
    'migrate',
    'diff',
    '--from-migrations',
    'prisma/schema/migrations',
    '--to-schema-datamodel',
    'prisma/schema',
    '--shadow-database-url',
    shadow,
    '--script',
  ],
  { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'inherit'] },
)

// Prisma prints a comment rather than nothing at all when there is no diff, so
// an empty-string check would happily write an empty migration folder.
const meaningful = sql
  .split('\n')
  .filter((line) => line.trim() && !line.trim().startsWith('--'))
  .join('\n')

if (!meaningful) {
  logger.info('Schema matches the migrations already; nothing to write')
  process.exit(0)
}

mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'migration.sql'), sql)

logger.info('Migration written', { path: join(dir, 'migration.sql') })
logger.info('Read it, then apply with: npx prisma migrate deploy')
