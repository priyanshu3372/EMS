import type { Prisma, EmployeeStatus } from '@prisma/client'
import type { ScopedDb } from '../../platform/db/scoped'
import type { ScopeContext } from '../../platform/authz/scope'

/**
 * Reading employees, filtered by what the caller is allowed to see.
 *
 * Two independent restrictions apply to every query here, and confusing them is
 * how data leaks:
 *
 *   COMPANY   handled above this file. `db` is already a forOrg() client, so
 *             organizationId is injected into every query whether or not this
 *             code remembers it.
 *   SCOPE     handled here. Which PEOPLE within that company — everyone, the
 *             caller's direct reports, or only the caller.
 *
 * Every exported function takes `scope` as a required argument. That is not
 * politeness; it means a caller cannot forget it, because leaving it out does
 * not compile.
 */

export interface FieldAccess {
  includeCompensation: boolean
  includeBank: boolean
  includeIdentity: boolean
}

export interface EmployeeFilters {
  search?: string | undefined
  departmentId?: string | undefined
  status?: EmployeeStatus | undefined
  includeArchived?: boolean | undefined
}

/**
 * Turns a data scope into a where clause.
 *
 * The switch is exhaustive on purpose and DEPARTMENT throws rather than
 * returning `{}`. An unhandled scope that quietly falls through to "no filter"
 * is the worst possible failure here — it would widen access silently, and
 * every test would still pass because the rows come back.
 */
function scopeWhere(scope: ScopeContext): Prisma.EmployeeWhereInput {
  switch (scope.scope) {
    case 'ORGANIZATION':
      // forOrg() has already confined this to one company.
      return {}

    case 'DIRECT_REPORTS':
      // A manager with no employee record of their own manages nobody. Without
      // this guard `reportingManagerId: null` would match every unmanaged
      // employee in the company.
      if (!scope.employeeId) return IMPOSSIBLE
      return {
        OR: [{ reportingManagerId: scope.employeeId }, { id: scope.employeeId }],
      }

    case 'SELF':
      if (!scope.employeeId) return IMPOSSIBLE
      return { id: scope.employeeId }

    case 'DEPARTMENT':
      // No role uses this yet. When one does it needs the caller's
      // departmentId, which ScopeContext does not carry — so it is a change to
      // make deliberately, not something to approximate here.
      throw new Error('DEPARTMENT scope is not implemented')
  }
}

/** Matches nothing. A uuid column can never hold this. */
const IMPOSSIBLE: Prisma.EmployeeWhereInput = { id: { equals: '00000000-0000-0000-0000-000000000000' } }

/**
 * What to join, decided by permission.
 *
 * The three sensitive tables are not fetched at all unless the caller may see
 * them. Fetching and then omitting in the serializer would work right up until
 * someone adds a log line, an export, or a debug response — and salary would be
 * in the process, available to be leaked. It is not read in the first place.
 */
function includeFor(access: FieldAccess) {
  return {
    department: { select: { id: true, name: true } },
    designation: { select: { id: true, name: true } },
    shift: { select: { id: true, name: true, startTime: true, endTime: true, expectedHours: true } },
    reportingManager: {
      select: { id: true, fullName: true, employeeCode: true, designation: { select: { name: true } } },
    },
    membership: { select: { id: true, role: true, status: true, user: { select: { email: true } } } },

    ...(access.includeCompensation
      ? { financials: { where: { effectiveTo: null }, orderBy: { effectiveFrom: 'desc' }, take: 1 } }
      : {}),
    ...(access.includeBank ? { bankAccount: true } : {}),
    ...(access.includeIdentity ? { statutoryIdentity: true } : {}),
  } satisfies Prisma.EmployeeInclude
}

export type EmployeeRow = Prisma.EmployeeGetPayload<{ include: ReturnType<typeof includeFor> }>

function filterWhere(filters: EmployeeFilters): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {}

  if (!filters.includeArchived) where.archivedAt = null
  if (filters.departmentId) where.departmentId = filters.departmentId
  if (filters.status) where.status = filters.status

  if (filters.search) {
    const search = filters.search.trim()
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { personalEmail: { contains: search, mode: 'insensitive' } },
      ]
    }
  }

  return where
}

export async function list(
  db: ScopedDb,
  scope: ScopeContext,
  access: FieldAccess,
  filters: EmployeeFilters = {},
): Promise<EmployeeRow[]> {
  return db.employee.findMany({
    where: { AND: [scopeWhere(scope), filterWhere(filters)] },
    include: includeFor(access),
    orderBy: [{ fullName: 'asc' }],
  }) as Promise<EmployeeRow[]>
}

export async function count(
  db: ScopedDb,
  scope: ScopeContext,
  filters: EmployeeFilters = {},
): Promise<number> {
  return db.employee.count({ where: { AND: [scopeWhere(scope), filterWhere(filters)] } })
}

/**
 * One employee by id — SCOPED, which is the whole point.
 *
 * findUnique is deliberately not used. It accepts only the unique key, so the
 * scope could not be applied and any employee could read any other by changing
 * a uuid in the URL. That is the classic IDOR hole, and "it is a by-id read, it
 * does not need filtering" is exactly how it gets written.
 *
 * Out of scope returns null, and the service turns that into 404 rather than
 * 403 — because 403 would confirm the row exists.
 */
export async function findById(
  db: ScopedDb,
  scope: ScopeContext,
  id: string,
  access: FieldAccess,
): Promise<EmployeeRow | null> {
  return db.employee.findFirst({
    where: { AND: [{ id }, scopeWhere(scope)] },
    include: includeFor(access),
  }) as Promise<EmployeeRow | null>
}
