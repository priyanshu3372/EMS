import { prisma, disconnect } from '../../src/platform/db/prisma'
import { logger } from '../../src/platform/logger'

/**
 * Reference data — the rows that must exist in every database, on every machine.
 *
 * Wired into `prisma.seed`, so `prisma migrate reset` rebuilds the schema AND
 * repopulates this. That is what makes resetting a broken dev database a
 * ten-second operation rather than an afternoon.
 *
 * MUST BE IDEMPOTENT. It runs on a fresh database, on a reset, and by hand.
 * Every write is an upsert; running it twice changes nothing.
 *
 * This fills up over the next few days:
 *   Day 7  — departments, designations, shifts
 *   Day 9  — leave types, holidays, professional-tax slabs
 *
 * Demo data — fake employees for a walkthrough — is deliberately NOT here. It
 * belongs in demo.ts, guarded so it refuses to run against production.
 */
async function seedReference(): Promise<void> {
  logger.info('Seeding reference data')

  // Nothing to seed yet — the master-data models arrive on Day 7.
  // The hook exists now so that `migrate reset` is already wired, and adding
  // the first table is a few lines rather than a plumbing exercise.

  logger.info('Reference data seeded')
}

seedReference()
  .catch((err: unknown) => {
    logger.error('Seeding failed', { error: err instanceof Error ? err.message : String(err) })
    process.exitCode = 1
  })
  .finally(disconnect)

// Keep the import used until the first real seed lands.
void prisma
