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


/**
 * The client's confirmed salary structure (§A13): Basic, HRA, DA, Conveyance,
 * Special Allowance, Incentive.
 *
 * ROWS, NOT COLUMNS. Every one of these is a record the company can rename,
 * reorder or archive, and adding a seventh is an insert rather than a migration
 * plus a deploy. The old system had them as fixed columns, which is why nobody
 * could add "Shift Allowance" without an engineer.
 *
 * `countsForPf` is the consequential flag, and it is only true for Basic and
 * DA here. Per the 2019 Supreme Court ruling an allowance paid ordinarily and
 * universally to everybody DOES form part of PF wages — so a special allowance
 * that everyone receives may well belong in the base. That is a judgement about
 * this company's pay structure, and it is the accountant's to make, not a
 * default to guess at. These values are a starting point they must confirm.
 */
const SALARY_COMPONENTS = [
  { code: 'BASIC', label: 'Basic', type: 'earning', countsForPf: true, taxable: true, displayOrder: 1 },
  { code: 'DA', label: 'Dearness Allowance', type: 'earning', countsForPf: true, taxable: true, displayOrder: 2 },
  { code: 'HRA', label: 'House Rent Allowance', type: 'earning', countsForPf: false, taxable: true, displayOrder: 3 },
  { code: 'CONV', label: 'Conveyance', type: 'earning', countsForPf: false, taxable: true, displayOrder: 4 },
  { code: 'SPECIAL', label: 'Special Allowance', type: 'earning', countsForPf: false, taxable: true, displayOrder: 5 },
  // Entered per employee per month, never on a salary record (§A1.5).
  { code: 'INCENTIVE', label: 'Incentive', type: 'earning', countsForPf: false, taxable: true, displayOrder: 6, entry: 'monthly' },
] as const

/**
 * Maharashtra professional tax.
 *
 * Seeded because it is statutory, published and stable — not a guess. Every
 * company operating in Maharashtra owes exactly these amounts, so leaving the
 * table empty would mean payroll silently deducting nothing.
 *
 * GENDERED, because the state is. Women pay nothing up to ₹25,000 where men
 * pay from ₹7,500 — applying the men's slabs to everybody over-deducts ₹200 a
 * month from every woman on the payroll, which nobody notices for a year and
 * then somebody does.
 *
 * ₹200 for eleven months and ₹300 in February is how the state reaches ₹2,500 a
 * year — the constitutional cap — without a fractional monthly figure.
 *
 * OTHER STATES ARE NOT SEEDED. An employee whose ptState is Karnataka matches
 * no slab and has no PT deducted. That is visible rather than wrong, but it has
 * to be entered before their first payslip.
 */
const MAHARASHTRA_PT = [
  { gender: 'male', minGross: 0, maxGross: 7500, amount: 0, februaryAmount: null },
  { gender: 'male', minGross: 7500.01, maxGross: 10000, amount: 175, februaryAmount: null },
  { gender: 'male', minGross: 10000.01, maxGross: null, amount: 200, februaryAmount: 300 },

  { gender: 'female', minGross: 0, maxGross: 25000, amount: 0, februaryAmount: null },
  { gender: 'female', minGross: 25000.01, maxGross: null, amount: 200, februaryAmount: 300 },
] as const

/**
 * Only the three fixed-date national holidays.
 *
 * Diwali, Holi and Eid move every year with the lunar calendar, and Indian
 * states each add their own. Seeding a guessed date would put a wrong day in
 * the leave calendar that looks authoritative — the client enters those.
 */
const FIXED_HOLIDAYS = [
  { name: 'Republic Day', month: 1, day: 26 },
  { name: 'Independence Day', month: 8, day: 15 },
  { name: 'Gandhi Jayanti', month: 10, day: 2 },
]

/** 1 April of the current financial year — when seeded rules take effect. */
function financialYearStart(): Date {
  const now = new Date()
  const year = now.getUTCMonth() + 1 >= 4 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
  return new Date(Date.UTC(year, 3, 1))
}

async function seedStatutory(organizationId: string): Promise<void> {
  const effectiveFrom = financialYearStart()

  for (const slab of MAHARASHTRA_PT) {
    await prisma.ptSlab.upsert({
      where: {
        organizationId_state_gender_minGross_effectiveFrom: {
          organizationId,
          state: 'Maharashtra',
          gender: slab.gender,
          minGross: slab.minGross,
          effectiveFrom,
        },
      },
      update: {},
      create: { organizationId, state: 'Maharashtra', effectiveFrom, ...slab },
    })
  }

  for (const component of SALARY_COMPONENTS) {
    await prisma.salaryComponent.upsert({
      where: { organizationId_code: { organizationId, code: component.code } },
      update: {},
      create: { organizationId, ...component },
    })
  }

  const year = new Date().getUTCFullYear()
  for (const holiday of FIXED_HOLIDAYS) {
    const date = new Date(Date.UTC(year, holiday.month - 1, holiday.day))
    await prisma.holiday.upsert({
      where: { organizationId_date_name: { organizationId, date, name: holiday.name } },
      update: {},
      create: { organizationId, name: holiday.name, date, type: 'public' },
    })
  }

  // The statutory defaults, so payroll has rates before anyone opens Settings.
  const existing = await prisma.organizationPolicy.findFirst({
    where: { organizationId, effectiveTo: null },
  })
  if (!existing) {
    await prisma.organizationPolicy.create({
      data: { organizationId, effectiveFrom },
    })
  }
}

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

  await seedStatutory(organizationId)
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
