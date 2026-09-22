import type { AppContext } from '../../platform/context'
import { NotFound } from '../../platform/errors/AppError'
import * as repo from './employee.repository'

/**
 * Employee reads.
 *
 * The service owns two decisions and delegates everything else: which fields
 * this caller may see, and what "not found" means for them.
 */

/**
 * Three permissions, not one.
 *
 * Salary, banking and tax identity are different classes of data held by
 * different roles. Accounts needs a bank account to pay someone and has no
 * business holding their PAN; HR needs the PAN for statutory filing and has no
 * business seeing the salary. A single `employee:read` would hand all three to
 * anyone who could see a name.
 */
function accessFor(ctx: AppContext): repo.FieldAccess {
  return {
    includeCompensation: ctx.can('employee:compensation:read'),
    includeBank: ctx.can('employee:bank:read'),
    includeIdentity: ctx.can('employee:identity:read'),
  }
}

export interface EmployeeListResult {
  rows: repo.EmployeeRow[]
  total: number
  access: repo.FieldAccess
}

export async function listEmployees(
  ctx: AppContext,
  filters: repo.EmployeeFilters = {},
): Promise<EmployeeListResult> {
  const access = accessFor(ctx)
  const scope = ctx.scopeFor('employee')

  const [rows, total] = await Promise.all([
    repo.list(ctx.db, scope, access, filters),
    repo.count(ctx.db, scope, filters),
  ])

  return { rows, total, access }
}

export interface EmployeeResult {
  row: repo.EmployeeRow
  access: repo.FieldAccess
}

/**
 * One employee, or 404.
 *
 * 404 and NOT 403, even when the row exists and the caller simply may not see
 * it. A 403 answers a question nobody should be able to ask: it confirms that
 * this particular id is a real employee. Given a few thousand guesses that maps
 * out the organization, and for an HR system the existence of a record is
 * itself information — a resignation can be detected before it is announced.
 *
 * "Not found" is also true from the caller's point of view. There is no
 * employee at that id, as far as they are concerned.
 */
export async function getEmployee(ctx: AppContext, id: string): Promise<EmployeeResult> {
  const access = accessFor(ctx)
  const row = await repo.findById(ctx.db, ctx.scopeFor('employee'), id, access)

  if (!row) throw NotFound('Employee not found')

  return { row, access }
}
