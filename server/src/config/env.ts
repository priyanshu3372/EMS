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
