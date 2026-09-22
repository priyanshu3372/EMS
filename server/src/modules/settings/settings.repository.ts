import type { ScopedDb } from '../../platform/db/scoped'

/**
 * Company configuration.
 *
 * Every query goes through the scoped client, so "this company's settings" is
 * enforced by the extension rather than remembered by each function.
 */

export async function getOrganization(db: ScopedDb, organizationId: string) {
  // Organization is a GLOBAL model — it is the company, not a row inside one —
  // so this is the one read here that needs its id passed explicitly.
  return db.organization.findUnique({ where: { id: organizationId } })
}

export async function updateOrganization(
  db: ScopedDb,
  organizationId: string,
  data: Record<string, unknown>,
) {
  return db.organization.update({ where: { id: organizationId }, data })
}

/** The policy in force now: the one row whose period has not been closed. */
export async function getCurrentPolicy(db: ScopedDb) {
  return db.organizationPolicy.findFirst({
    where: { effectiveTo: null },
    orderBy: { effectiveFrom: 'desc' },
  })
}

export async function listPolicies(db: ScopedDb) {
  return db.organizationPolicy.findMany({ orderBy: { effectiveFrom: 'desc' } })
}

export async function listGeofences(db: ScopedDb) {
  return db.geofenceLocation.findMany({ orderBy: { name: 'asc' } })
}

export async function listLeaveTypes(db: ScopedDb) {
  return db.leaveType.findMany({
    where: { archivedAt: null },
    orderBy: { code: 'asc' },
  })
}

export async function findLeaveType(db: ScopedDb, id: string) {
  // findFirst, not findUnique — the company filter has to apply.
  return db.leaveType.findFirst({ where: { id, archivedAt: null } })
}

export async function listPtSlabs(db: ScopedDb, state?: string) {
  return db.ptSlab.findMany({
    where: { effectiveTo: null, ...(state ? { state } : {}) },
    orderBy: [{ state: 'asc' }, { minGross: 'asc' }],
  })
}

export async function listHolidays(db: ScopedDb, year?: number) {
  const where =
    year === undefined
      ? {}
      : {
          date: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1)),
          },
        }

  return db.holiday.findMany({ where, orderBy: { date: 'asc' } })
}
