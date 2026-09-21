import type { Role } from '@prisma/client'

/**
 * WHOSE rows an action covers, once a permission has established that the
 * action is allowed at all.
 *
 * This is the half that role checks always get wrong. A manager and an employee
 * both hold `leave:read`; the difference is that one means "my team's leave"
 * and the other means "mine". Encoding that as a scope rather than as two
 * permissions is what stops the list in permissions.ts from doubling every time
 * a role is added.
 *
 * It is also where the classic hole lives. Scope gets applied to list
 * endpoints, because a list obviously needs filtering — and then forgotten on
 * GET /employees/:id, because "they asked for one row by id". That is IDOR, and
 * it is how an employee reads the managing director's salary by changing a
 * number in the URL. Repository functions therefore REQUIRE a scope argument on
 * every read, by id or otherwise.
 *
 * And when a row falls outside scope, the answer is 404, never 403. A 403 says
 * "this exists and you may not see it", which confirms the row exists — enough
 * to enumerate the employee table one id at a time.
 */
export type DataScope = 'SELF' | 'DIRECT_REPORTS' | 'DEPARTMENT' | 'ORGANIZATION'

/** The resources whose rows belong to a particular person. */
export type ScopedResource = 'employee' | 'attendance' | 'leave' | 'payslip' | 'document'

const ORG: DataScope = 'ORGANIZATION'
const TEAM: DataScope = 'DIRECT_REPORTS'
const SELF: DataScope = 'SELF'

/**
 * Read from Role_Permission_Documentation.md §3.1.
 *
 * Manager and RM get ORGANIZATION on `employee` because the matrix says
 * "👁 View" there without qualifying it to their team, while it explicitly says
 * "🟡 Team" for attendance and leave. They still cannot see salary, bank or tax
 * identity — those are separate permissions they do not hold — so this is the
 * staff directory, not the personnel file.
 */
const SCOPES: Record<Role, Record<ScopedResource, DataScope>> = {
  super_admin: { employee: ORG, attendance: ORG, leave: ORG, payslip: ORG, document: ORG },
  admin: { employee: ORG, attendance: SELF, leave: SELF, payslip: SELF, document: ORG },
  hr: { employee: ORG, attendance: ORG, leave: ORG, payslip: SELF, document: ORG },
  manager: { employee: ORG, attendance: TEAM, leave: TEAM, payslip: SELF, document: SELF },
  rm: { employee: ORG, attendance: TEAM, leave: TEAM, payslip: SELF, document: SELF },
  accounts: { employee: ORG, attendance: SELF, leave: SELF, payslip: ORG, document: SELF },
  employee: { employee: SELF, attendance: SELF, leave: SELF, payslip: SELF, document: SELF },
}

export function scopeFor(role: Role, resource: ScopedResource): DataScope {
  return SCOPES[role][resource]
}

/**
 * What a repository needs in order to filter. Built by the http layer from the
 * authenticated request and passed down; nothing below http constructs one, so
 * a service cannot quietly widen its own scope.
 */
export interface ScopeContext {
  scope: DataScope
  /** The caller's own Employee row, when they have one. Null for an operator. */
  employeeId: string | null
}
