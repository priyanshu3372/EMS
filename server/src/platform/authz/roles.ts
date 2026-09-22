import type { Role } from '@prisma/client'
import { PERMISSIONS, type Permission } from './permissions'

/**
 * Which role holds which permissions.
 *
 * Transcribed from Role_Permission_Documentation.md §3.1 and §3.2, which is the
 * client's own matrix. When they want a change, it is changed here and nowhere
 * else — and authz.test.ts asserts this file still matches that document.
 *
 * super_admin is ENUMERATED rather than given a wildcard. A wildcard silently
 * grants every permission added later, including ones that did not exist when
 * anyone last thought about who should have them. Writing the list out means
 * adding a permission forces a decision.
 */

/** Everything. Listed, not inferred. */
const SUPER_ADMIN: readonly Permission[] = PERMISSIONS

/**
 * An operator, not a member of staff. Manages people and documents; has no
 * business seeing attendance, leave or payroll.
 */
const ADMIN: readonly Permission[] = [
  'dashboard:read',
  'employee:read',
  'employee:create',
  'employee:update',
  'document:read',
  'document:upload',
  'document:verify',
]

/** Runs the people side day to day. No payroll, no settings. */
const HR: readonly Permission[] = [
  'dashboard:read',
  'employee:read',
  'employee:create',
  'employee:update',
  'employee:identity:read',
  'attendance:read',
  'attendance:punch',
  'attendance:mark',
  'attendance:update',
  'attendance:delete',
  'leave:read',
  'leave:apply',
  'leave:approve',
  'document:read',
  'document:upload',
  'document:verify',
]

/**
 * Sees their own team and approves its leave. The same permission strings as
 * HR for reading — what differs is the DATA SCOPE, which limits them to direct
 * reports. See scope.ts.
 */
const MANAGER: readonly Permission[] = [
  'dashboard:read',
  'employee:read',
  'attendance:read',
  'attendance:punch',
  'leave:read',
  'leave:apply',
  'leave:approve',
  // No document access at all: §3.1 marks Documents ❌ for Manager and RM, and
  // §4.4 repeats it. That leaves a manager with LESS document access than an
  // ordinary employee, which is unusual enough to be worth asking about —
  // see OPEN_QUESTIONS below.
]

/** The client's matrix gives RM and Manager identical rights. */
const RM: readonly Permission[] = MANAGER

/**
 * Payroll only. Holds compensation and bank reads because a payroll run cannot
 * be produced without them — and holds neither attendance nor leave, so the
 * person who moves the money cannot also alter the record it is based on.
 */
const ACCOUNTS: readonly Permission[] = [
  'dashboard:read',
  // Deliberately NOT employee:read. §3.1 marks the Employees module ❌ for this
  // role and §4.5 says "No access to: Employees page", while still allowing
  // "Employee financial data ... within payslip context". So the compensation
  // and bank reads below are reached through payroll endpoints, never through
  // the staff directory — which is what keeps finance isolated from people ops.
  'employee:compensation:read',
  'employee:bank:read',
  'payroll:structure:read',
  'payroll:structure:manage',
  'payroll:run:create',
  'payslip:read',
]

/**
 * Themselves, and nothing else. Every read here is narrowed to SELF by the data
 * scope, so `leave:read` means their own leave and `payslip:read` means their
 * own payslips.
 */
const EMPLOYEE: readonly Permission[] = [
  'dashboard:read',
  'attendance:read',
  'attendance:punch',
  'leave:read',
  'leave:apply',
  'document:read',
  'document:upload',
  'payslip:read',
]

const REGISTRY: Record<Role, readonly Permission[]> = {
  super_admin: SUPER_ADMIN,
  admin: ADMIN,
  hr: HR,
  manager: MANAGER,
  rm: RM,
  accounts: ACCOUNTS,
  employee: EMPLOYEE,
}

/** Lookup sets, so roleCan() is a hash probe rather than a scan of the array. */
const SETS: Record<Role, ReadonlySet<Permission>> = {
  super_admin: new Set(SUPER_ADMIN),
  admin: new Set(ADMIN),
  hr: new Set(HR),
  manager: new Set(MANAGER),
  rm: new Set(RM),
  accounts: new Set(ACCOUNTS),
  employee: new Set(EMPLOYEE),
}

export function permissionsFor(role: Role): readonly Permission[] {
  return REGISTRY[role]
}

export function roleCan(role: Role, permission: Permission): boolean {
  return SETS[role].has(permission)
}

/**
 * KNOWN GAP, raised with the client rather than quietly worked around.
 *
 * §3.2 gives `admin` and `accounts` no right to apply for leave. That is
 * coherent if those roles are pure operators — an outside accountant, say. But
 * a person holds exactly one role here, so an office manager who is BOTH an
 * administrator and a member of staff would have no way to request leave.
 *
 * Following the document as written until they answer. The fix, if they want
 * one, is to add 'leave:apply' to ADMIN and ACCOUNTS — one line each.
 */
export const OPEN_QUESTIONS = [
  'Can an admin or accounts user apply for their own leave? §3.2 currently says no.',
  'Can a manager or RM see documents at all? §3.1 and §4.4 say no, which leaves them with less access than the people they manage.',
] as const
