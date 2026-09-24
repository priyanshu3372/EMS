import type { Prisma, AttendanceStatus, AttendanceSource } from '@prisma/client'
import type { ScopedDb } from '../../platform/db/scoped'
import type { ScopeContext } from '../../platform/authz/scope'
import { toDateColumn, type CalendarDate } from '../../domain/shared/dates'

/**
 * Reading attendance.
 *
 * Same two restrictions as everywhere: the company filter comes free from the
 * scoped client, and WHOSE rows is the data scope — ORGANIZATION for HR,
 * DIRECT_REPORTS for a manager, SELF for an employee. Every function takes the
 * scope as a required argument, so it cannot be forgotten.
 */

function scopeWhere(scope: ScopeContext): Prisma.AttendanceWhereInput {
  switch (scope.scope) {
    case 'ORGANIZATION':
      return {}

    case 'DIRECT_REPORTS':
      if (!scope.employeeId) return IMPOSSIBLE
      return {
        OR: [
          { employee: { reportingManagerId: scope.employeeId } },
          { employeeId: scope.employeeId },
        ],
      }

    case 'SELF':
      if (!scope.employeeId) return IMPOSSIBLE
      return { employeeId: scope.employeeId }

    case 'DEPARTMENT':
      // Unhandled rather than approximated. A scope that quietly falls through
      // to "no filter" would widen access without failing any test.
      throw new Error('DEPARTMENT scope is not implemented')
  }
}

const IMPOSSIBLE: Prisma.AttendanceWhereInput = {
  employeeId: { equals: '00000000-0000-0000-0000-000000000000' },
}

/**
 * The first day of a month, and the first day of the NEXT month.
 *
 * Half-open — `>= from` and `< until` — which is what makes this correct for
 * every month without knowing how long any of them is.
 *
 * The old client built the range end as `${year}-${month}-31`. For February,
 * April, June, September and November that string is not a date, so the query
 * returned nothing and the monthly view was BLANK FIVE MONTHS A YEAR. Nobody
 * reported it as a bug; they reported that attendance "sometimes does not
 * load", which is a much harder thing to find.
 */
export function monthRange(year: number, month: number): { from: Date; until: Date } {
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    until: new Date(Date.UTC(year, month, 1)),
  }
}

export interface AttendanceFilters {
  date?: CalendarDate | undefined
  year?: number | undefined
  month?: number | undefined
  employeeId?: string | undefined
  status?: AttendanceStatus | undefined
  departmentId?: string | undefined
}

function filterWhere(filters: AttendanceFilters): Prisma.AttendanceWhereInput {
  const where: Prisma.AttendanceWhereInput = {}

  if (filters.date) {
    where.date = toDateColumn(filters.date)
  } else if (filters.year && filters.month) {
    const { from, until } = monthRange(filters.year, filters.month)
    where.date = { gte: from, lt: until }
  }

  if (filters.employeeId) where.employeeId = filters.employeeId
  if (filters.status) where.status = filters.status
  if (filters.departmentId) where.employee = { departmentId: filters.departmentId }

  return where
}

const listInclude = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      attendanceMode: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
    },
  },
} as const

export type AttendanceRow = Prisma.AttendanceGetPayload<{ include: typeof listInclude }>

export async function list(
  db: ScopedDb,
  scope: ScopeContext,
  filters: AttendanceFilters,
): Promise<AttendanceRow[]> {
  return db.attendance.findMany({
    where: { AND: [scopeWhere(scope), filterWhere(filters)] },
    include: listInclude,
    orderBy: [{ date: 'desc' }, { employee: { fullName: 'asc' } }],
  }) as Promise<AttendanceRow[]>
}

export async function findById(
  db: ScopedDb,
  scope: ScopeContext,
  id: string,
): Promise<AttendanceRow | null> {
  // findFirst, not findUnique — a by-id read still has to be scoped, or an
  // employee edits somebody else's day by changing a uuid.
  return db.attendance.findFirst({
    where: { AND: [{ id }, scopeWhere(scope)] },
    include: listInclude,
  }) as Promise<AttendanceRow | null>
}

export interface MonthlyTotal {
  employeeId: string
  totalHours: number
  daysPresent: number
  daysHalf: number
  daysAbsent: number
  daysOnLeave: number
}

/**
 * Monthly hours per employee — the figure the client asked for by name.
 *
 * AGGREGATED IN POSTGRES, not summed in the browser. The difference matters
 * once a month has two hundred rows across fifty people: the browser version
 * has to fetch every row to add them up, which is slow, and it adds up only the
 * rows the page happened to load — so a paginated list silently reports a
 * smaller total than the real one.
 *
 * Counting statuses in the same pass rather than in a second query, because the
 * two must describe the same set of rows. Two queries can disagree if a row is
 * written between them.
 */
export async function monthlyTotals(
  db: ScopedDb,
  scope: ScopeContext,
  year: number,
  month: number,
  employeeId?: string,
): Promise<MonthlyTotal[]> {
  const { from, until } = monthRange(year, month)

  const where: Prisma.AttendanceWhereInput = {
    AND: [scopeWhere(scope), { date: { gte: from, lt: until } }],
    ...(employeeId ? { employeeId } : {}),
  }

  const [sums, statusCounts] = await Promise.all([
    db.attendance.groupBy({
      by: ['employeeId'],
      where,
      _sum: { hoursWorked: true },
    }),
    db.attendance.groupBy({
      by: ['employeeId', 'status'],
      where,
      _count: { _all: true },
    }),
  ])

  const byEmployee = new Map<string, MonthlyTotal>()

  for (const row of sums) {
    byEmployee.set(row.employeeId, {
      employeeId: row.employeeId,
      totalHours: row._sum.hoursWorked ? Number(row._sum.hoursWorked) : 0,
      daysPresent: 0,
      daysHalf: 0,
      daysAbsent: 0,
      daysOnLeave: 0,
    })
  }

  for (const row of statusCounts) {
    const entry = byEmployee.get(row.employeeId)
    if (!entry) continue

    const count = row._count._all
    if (row.status === 'present') entry.daysPresent = count
    else if (row.status === 'half_day') entry.daysHalf = count
    else if (row.status === 'absent') entry.daysAbsent = count
    else if (row.status === 'on_leave') entry.daysOnLeave = count
  }

  return [...byEmployee.values()]
}

/** The company-wide figures the dashboard shows for one day. */
export interface DaySummary {
  date: CalendarDate
  present: number
  absent: number
  halfDay: number
  onLeave: number
  notMarked: number
  totalEmployees: number
}

export async function daySummary(
  db: ScopedDb,
  scope: ScopeContext,
  date: CalendarDate,
): Promise<DaySummary> {
  const [counts, totalEmployees] = await Promise.all([
    db.attendance.groupBy({
      by: ['status'],
      where: { AND: [scopeWhere(scope), { date: toDateColumn(date) }] },
      _count: { _all: true },
    }),
    db.employee.count({ where: { archivedAt: null } }),
  ])

  const of = (status: AttendanceStatus) =>
    counts.find((c) => c.status === status)?._count._all ?? 0

  const marked = counts.reduce((sum, c) => sum + c._count._all, 0)

  return {
    date,
    present: of('present'),
    absent: of('absent'),
    halfDay: of('half_day'),
    onLeave: of('on_leave'),
    // "Nobody has recorded anything for these people yet" is a different fact
    // from "they were absent", and the dashboard must not conflate them — the
    // old one did, and reported the whole company absent every morning.
    notMarked: Math.max(0, totalEmployees - marked),
    totalEmployees,
  }
}

export interface UpsertInput {
  employeeId: string
  date: CalendarDate
  checkIn: Date | null
  checkOut: Date | null
  status: AttendanceStatus
  source: AttendanceSource
  hoursWorked: number | null
  expectedHours: number | null
  shiftId: string | null
  note: string | null
  markedByUserId: string
}

export async function upsertDay(
  db: ScopedDb,
  organizationId: string,
  input: UpsertInput,
): Promise<AttendanceRow> {
  const existing = await db.attendance.findFirst({
    where: { employeeId: input.employeeId, date: toDateColumn(input.date) },
  })

  const data = {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    status: input.status,
    source: input.source,
    hoursWorked: input.hoursWorked,
    expectedHours: input.expectedHours,
    shiftId: input.shiftId,
    note: input.note,
    markedByUserId: input.markedByUserId,
  }

  const row = existing
    ? await db.attendance.update({ where: { id: existing.id }, data })
    : await db.attendance.create({
        data: {
          organizationId,
          employeeId: input.employeeId,
          date: toDateColumn(input.date),
          ...data,
        },
      })

  return findById(db, { scope: 'ORGANIZATION', employeeId: null }, row.id) as Promise<AttendanceRow>
}
