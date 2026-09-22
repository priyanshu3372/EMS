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
 *   Day 9  — holidays, professional-tax slabs
 *
 * Demo data — fake employees for a walkthrough — is deliberately NOT here. It
 * belongs in demo.ts, guarded so it refuses to run against production.
 */

/**
 * Starting lists for a new company. Every one of these is EDITABLE in Settings
 * once that page lands — they are a sensible first day, not a fixed taxonomy.
 * A company that does not use "Intern" archives it; it is not stuck with ours.
 */
const DEPARTMENTS = [
  'Human Resources',
  'Sales',
  'Operations',
  'Finance',
  'Technology',
]

const DESIGNATIONS = [
  'Executive',
  'Senior Executive',
  'Team Lead',
  'Manager',
  'Senior Manager',
  'Head',
]

/**
 * The client's stated working day is nine hours (§A1.5), which is what makes
 * "did they work their shift?" answerable on Day 11.
 */
const SHIFTS = [
  { name: 'General', startTime: '09:30', endTime: '18:30', breakMinutes: 60, expectedHours: 9 },
  { name: 'Early', startTime: '08:00', endTime: '17:00', breakMinutes: 60, expectedHours: 9 },
  { name: 'Late', startTime: '11:00', endTime: '20:00', breakMinutes: 60, expectedHours: 9 },
]

/** The five the existing UI already offers, with their short codes. */
const LEAVE_TYPES = [
  { code: 'CL', name: 'Casual Leave', annualQuota: 12, isPaid: true, carryForward: false },
  { code: 'SL', name: 'Sick Leave', annualQuota: 12, isPaid: true, carryForward: false },
  { code: 'EL', name: 'Earned Leave', annualQuota: 15, isPaid: true, carryForward: true, carryForwardCap: 30 },
  { code: 'WFH', name: 'Work From Home', annualQuota: 0, isPaid: true, carryForward: false },
  { code: 'CO', name: 'Comp Off', annualQuota: 0, isPaid: true, carryForward: false },
]

async function seedForOrganization(organizationId: string): Promise<void> {
  for (const name of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: {},
      create: { organizationId, name },
    })
  }

  for (const name of DESIGNATIONS) {
    await prisma.designation.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: {},
      create: { organizationId, name },
    })
  }

  for (const shift of SHIFTS) {
    await prisma.shift.upsert({
      where: { organizationId_name: { organizationId, name: shift.name } },
      update: {},
      create: { organizationId, ...shift },
    })
  }

  for (const type of LEAVE_TYPES) {
    await prisma.leaveType.upsert({
      where: { organizationId_code: { organizationId, code: type.code } },
      update: {},
      create: { organizationId, ...type },
    })
  }
}

async function seedReference(): Promise<void> {
  const organizations = await prisma.organization.findMany({ select: { id: true, name: true } })

  if (organizations.length === 0) {
    // Not an error. A fresh database has no company until bootstrap runs, and
    // reference data is per-company — there is simply nothing to attach it to.
    logger.info('No organizations yet; run npm run bootstrap first')
    return
  }

  for (const organization of organizations) {
    await seedForOrganization(organization.id)
    logger.info('Reference data seeded', { organization: organization.name })
  }
}

seedReference()
  .catch((err: unknown) => {
    logger.error('Seeding failed', { error: err instanceof Error ? err.message : String(err) })
    process.exitCode = 1
  })
  .finally(disconnect)
