import { prisma, disconnect } from '../src/platform/db/prisma'
import { logger } from '../src/platform/logger'
import { zonedToday } from '../src/domain/shared/dates'

/**
 * Grants the year's leave to everybody who has not had it yet.
 *
 *   npm run grant-leave              this leave year
 *   npm run grant-leave -- 2025      a specific one
 *
 * WHY THIS EXISTS. Balances are the sum of ledger entries and nothing else, so
 * an employee with no entries has a balance of zero — and every employee
 * imported from the CSV on Day 10 has exactly that. Without this they cannot
 * apply for a single day, and HR would conclude the leave module does not work.
 *
 * IDEMPOTENT, and that matters more here than anywhere else. Running it twice
 * would otherwise grant the year twice, and the error would show up as
 * everybody mysteriously having double their entitlement — which nobody
 * reports, because who complains about extra leave?
 *
 * It is a script rather than something automatic on purpose. Granting a year of
 * leave to the whole company is a deliberate act with a date on it, not
 * something that should happen because somebody opened a page.
 */

/** Which leave year a date falls in, given the month the year starts. */
function leaveYearOf(date: string, startMonth: number): number {
  const [year, month] = date.split('-').map(Number)
  return month! >= startMonth ? year! : year! - 1
}

interface GrantSummary {
  organization: string
  leaveYear: number
  employeesConsidered: number
  entriesCreated: number
  alreadyGranted: number
  carriedForward: number
}

async function grantForOrganization(
  organizationId: string,
  organizationName: string,
  requestedYear?: number,
): Promise<GrantSummary> {
  const [organization, policy] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { timezone: true },
    }),
    prisma.organizationPolicy.findFirst({
      where: { organizationId, effectiveTo: null },
    }),
  ])

  const startMonth = policy?.leaveYearStartMonth ?? 4
  const today = zonedToday(new Date(), organization.timezone)
  const leaveYear = requestedYear ?? leaveYearOf(today, startMonth)

  const [employees, leaveTypes] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId, archivedAt: null },
      select: { id: true, employeeCode: true, dateOfJoining: true },
    }),
    prisma.leaveType.findMany({ where: { organizationId, archivedAt: null } }),
  ])

  // Everything already granted for this year, in one query rather than one per
  // employee per type. With 200 staff and 5 leave types that is 1,000 round
  // trips saved.
  const existing = await prisma.leaveLedgerEntry.findMany({
    where: { organizationId, leaveYear, reason: { in: ['opening_grant', 'carry_forward'] } },
    select: { employeeId: true, leaveTypeId: true, reason: true },
  })

  const granted = new Set(existing.map((e) => `${e.employeeId}|${e.leaveTypeId}|${e.reason}`))

  let entriesCreated = 0
  let alreadyGranted = 0
  let carriedForward = 0

  for (const employee of employees) {
    for (const type of leaveTypes) {
      const quota = Number(type.annualQuota)

      // Types with no annual quota — comp off, work from home — are granted
      // case by case, not accrued. Creating a zero entry for them would be
      // noise in a ledger whose whole purpose is being readable.
      if (quota <= 0) continue

      const key = `${employee.id}|${type.id}|opening_grant`
      if (granted.has(key)) {
        alreadyGranted += 1
        continue
      }

      // Somebody who joined in October does not get a full year. Pro-rating by
      // completed months is the common rule; granting the lot would hand a new
      // joiner twelve days on their first morning.
      const days = proRate(quota, employee.dateOfJoining, leaveYear, startMonth)
      if (days <= 0) continue

      await prisma.leaveLedgerEntry.create({
        data: {
          organizationId,
          employeeId: employee.id,
          leaveTypeId: type.id,
          leaveYear,
          days,
          reason: 'opening_grant',
          note:
            days === quota
              ? null
              : `Pro-rated from ${employee.dateOfJoining?.toISOString().slice(0, 10) ?? 'joining'}`,
        },
      })
      entriesCreated += 1

      // Carry forward from last year, capped, for types that allow it.
      if (type.carryForward) {
        const carryKey = `${employee.id}|${type.id}|carry_forward`
        if (!granted.has(carryKey)) {
          const previous = await prisma.leaveLedgerEntry.aggregate({
            where: { employeeId: employee.id, leaveTypeId: type.id, leaveYear: leaveYear - 1 },
            _sum: { days: true },
          })

          const unused = previous._sum.days ? Number(previous._sum.days) : 0
          const cap = Number(type.carryForwardCap)
          const carried = Math.max(0, Math.min(unused, cap))

          if (carried > 0) {
            await prisma.leaveLedgerEntry.create({
              data: {
                organizationId,
                employeeId: employee.id,
                leaveTypeId: type.id,
                leaveYear,
                days: carried,
                reason: 'carry_forward',
                note: `Carried from ${leaveYear - 1}, capped at ${cap}`,
              },
            })
            carriedForward += 1
          }
        }
      }
    }
  }

  return {
    organization: organizationName,
    leaveYear,
    employeesConsidered: employees.length,
    entriesCreated,
    alreadyGranted,
    carriedForward,
  }
}

/**
 * A full year for somebody who was here for all of it, less for anybody who
 * joined partway through.
 *
 * Rounded to the nearest half day, because half days are the smallest unit the
 * rest of the system deals in — granting 7.33 days would produce a balance
 * nobody can spend exactly.
 */
function proRate(
  quota: number,
  dateOfJoining: Date | null,
  leaveYear: number,
  startMonth: number,
): number {
  if (!dateOfJoining) return quota

  const yearStart = new Date(Date.UTC(leaveYear, startMonth - 1, 1))
  if (dateOfJoining <= yearStart) return quota

  const yearEnd = new Date(Date.UTC(leaveYear + 1, startMonth - 1, 1))
  // Joined after this leave year ended — nothing to grant for it.
  if (dateOfJoining >= yearEnd) return 0

  const monthsRemaining =
    (yearEnd.getUTCFullYear() - dateOfJoining.getUTCFullYear()) * 12 +
    (yearEnd.getUTCMonth() - dateOfJoining.getUTCMonth())

  return Math.round((quota * monthsRemaining) / 12 * 2) / 2
}

async function main(): Promise<void> {
  const requested = process.argv[2] ? Number(process.argv[2]) : undefined

  if (requested !== undefined && (Number.isNaN(requested) || requested < 2000 || requested > 2100)) {
    console.error('\n  Usage: npm run grant-leave -- [year]\n')
    process.exitCode = 1
    return
  }

  const organizations = await prisma.organization.findMany({ select: { id: true, name: true } })

  if (organizations.length === 0) {
    logger.info('No organizations yet; run npm run bootstrap first')
    return
  }

  for (const organization of organizations) {
    const summary = await grantForOrganization(organization.id, organization.name, requested)

    console.log('')
    console.log(`  ${summary.organization} — leave year ${summary.leaveYear}`)
    console.log(`    employees            ${summary.employeesConsidered}`)
    console.log(`    opening grants made  ${summary.entriesCreated}`)
    console.log(`    already had one      ${summary.alreadyGranted}`)
    console.log(`    carried forward      ${summary.carriedForward}`)
  }

  console.log('')
  console.log('  Safe to run again — nobody is granted twice.')
  console.log('')
}

main()
  .catch((err: unknown) => {
    logger.error('Leave grant failed', { error: err instanceof Error ? err.message : String(err) })
    process.exitCode = 1
  })
  .finally(disconnect)
