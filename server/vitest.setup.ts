import { env } from './src/config/env'

/**
 * Refuses to run the suite against anything but a local database.
 *
 * The tests create and delete rows as a matter of course. Pointed at the
 * development database that is merely annoying; pointed at production it is
 * unrecoverable — and the only thing deciding which one it is, is whichever
 * DATABASE_URL happened to be loaded. A forgotten .env.test, a stray export, a
 * copied command from a deployment runbook: each of those is one keystroke away
 * from a very bad afternoon.
 *
 * So this is a hard stop rather than a warning. A warning scrolls past.
 */
const host = new URL(env.DATABASE_URL).hostname

if (host !== 'localhost' && host !== '127.0.0.1') {
  throw new Error(
    `\n\n  Tests refuse to run against "${host}".\n\n` +
      `  This suite deletes rows, so it only runs against local Postgres.\n` +
      `  Copy server/.env.test.example to server/.env.test and fill it in.\n`,
  )
}
