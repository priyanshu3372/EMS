import dotenv from 'dotenv'
import { z } from 'zod'

/**
 * .env holds everything. .env.test then overrides just the database, so the
 * test suite runs against local Postgres instead of Neon.
 *
 * That split matters more than it looks. Tests create and delete rows with
 * abandon; pointing them at the development database would be merely rude, but
 * pointing them at production would be a disaster, and the only thing standing
 * between those two is which URL happens to be loaded. Making the test database
 * a separate, explicit file means a test run cannot silently inherit whatever
 * .env was set to.
 *
 * It is also the difference between a suite that takes seconds and one that
 * takes minutes — Neon answers in seconds per query from here, local Postgres
 * in single-digit milliseconds.
 */
dotenv.config()

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test', override: true })
}

/**
 * The ONLY file in this codebase that reads process.env.
 *
 * It validates shape, not just presence — a PORT that is not a number and a
 * CORS_ORIGIN that is not a URL both fail here, at boot, with a readable
 * message. Nothing downstream ever has to wonder whether config is sane.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.url(),

  /// Pooled endpoint — what the running app uses.
  DATABASE_URL: z.string().startsWith('postgresql://'),
  /// Unpooled endpoint — Prisma Migrate needs session-level advisory locks,
  /// which PgBouncer cannot provide.
  DIRECT_URL: z.string().startsWith('postgresql://'),

  /// Access tokens are short-lived and never leave memory, so this key signs
  /// something that is replaced every 15 minutes.
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  /// Refresh tokens sit in a cookie for a week, so they are signed with a
  /// DIFFERENT key. Sharing one key would let a refresh token be presented as
  /// an access token, and the 15-minute access window would mean nothing.
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  /// 'local' in development; 'r2' in production, added on Day 19.
  /// Production never uses the VPS disk — see platform/storage/index.ts.
  STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
  STORAGE_PATH: z.string().default('./uploads'),
}).refine((c) => c.JWT_ACCESS_SECRET !== c.JWT_REFRESH_SECRET, {
  path: ['JWT_REFRESH_SECRET'],
  message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET',
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('\n  Invalid environment configuration:\n')
  for (const issue of parsed.error.issues) {
    console.error(`    ${issue.path.join('.') || '(root)'}: ${issue.message}`)
  }
  console.error('\n  Check server/.env against server/.env.example\n')
  process.exit(1)
}

export const env = Object.freeze(parsed.data)
export type Env = typeof env
