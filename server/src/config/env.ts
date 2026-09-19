import 'dotenv/config'
import { z } from 'zod'

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
