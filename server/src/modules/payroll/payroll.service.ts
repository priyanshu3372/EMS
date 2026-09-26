import type { AppContext } from '../../platform/context'
import { NotFound, BadRequest, Conflict } from '../../platform/errors/AppError'
import {
  computeSalary,
  daysInMonth,
  employmentDaysInMonth,
  type SalaryResult,
  type SalaryComponentValue,
} from '../../domain/payroll/salary'
import { isEpsMember, type Gender, type PtSlabRule } from '../../domain/payroll/statutory'
import { toDateColumn, fromDateColumn } from '../../domain/shared/dates'
import { coverageFor, type Coverage } from './esiCoverage.service'
import * as repo from './payroll.repository'

/**
 * One employee's salary for one month, calculated from what is on record.
 *
 * This is the seam between the pure engine in `domain/payroll` and the
 * database. It gathers every input the engine needs — the salary in force that
 * month, the company's rates that month, the PT slabs for where the person
 * works, their locked ESI coverage — and hands them over. It does no
 * arithmetic of its own. If a number on a payslip is wrong, it is wrong in the
 * domain, or it was wrong in the data; it is never wrong HERE, because nothing
 * here computes anything.
 *
 * WHAT IS DELIBERATELY NOT HERE YET (Day 16):
 *
 *   · Loss of pay. `lopDays` is an input, defaulting to zero, because deciding
 *     it needs attendance, approved leave and a sandwich-rule policy — none of
 *     which belong in the salary engine.
 *   · TDS. Entered by hand per employee per month in v1. An input, default 0.
 *   · Where monthly entries are STORED. Incentive is entered per employee per
 *     month (§A1.5); Day 16 records it in EmployeeIncentive. Until then it
 *     arrives here as `monthlyAmounts`, exactly as LOP and TDS do.
 *   · Persisting anything but the ESI decision. This calculates; the payroll
 *     RUN is what snapshots a payslip, and a preview must never masquerade as
 *     one.
 */

export interface CalculationOptions {
  /** Unpaid days, from attendance. Day 16 supplies this. */
  lopDays?: number
  /** Income tax for the month, entered by hand in v1. */
  tds?: number
  /**
   * Amounts entered for this month against `monthly` components, keyed by
   * component code — `{ INCENTIVE: 5000 }`. Day 16 supplies these from
   * EmployeeIncentive. A component with nothing entered has no line at all.
   */
  monthlyAmounts?: Record<string, number>
}

export interface Calculation {
  employee: {
    id: string
    fullName: string
    employeeCode: string
  }
  year: number
  month: number
  result: SalaryResult

  /**
   * Every fact the calculation rested on, alongside the answer.
   *
   * Kept because "why is my PF ₹1,800?" has to be answerable months later, and
   * the answer is these values rather than whatever the rates happen to be on
   * the day somebody asks. Day 16 writes this onto the payslip verbatim.
   */
  basis: {
    salaryEffectiveFrom: string
    policyEffectiveFrom: string
    employmentDays: number
    esi: Coverage
    epsMember: boolean
    ptState: string | null
    ptGender: Gender
    /** Set when something was missing and the calculation had to assume. */
    warnings: string[]
  }
}

/**
 * The PT table uses 'any' for a slab that applies to everybody. An employee
 * recorded as 'other', or not recorded at all, is matched against that — the
 * only honest reading of a table the state wrote with two columns.
 */
function ptGenderOf(gender: 'male' | 'female' | 'other' | null): Gender {
  return gender === 'male' || gender === 'female' ? gender : 'any'
}

/**
 * PF wages at joining: the fixed earnings the accountant marked as counting.
 * Fixed only — a monthly entry is not part of what somebody was hired at.
 */
function pfWagesOf(
  financial: Awaited<ReturnType<typeof repo.findFirstFinancial>>,
): number {
  if (!financial) return 0
  return financial.components
    .filter(
      (row) =>
        row.component.type === 'earning' &&
        row.component.entry === 'fixed' &&
        row.component.countsForPf,
    )
    .reduce((sum, row) => sum + Number(row.amount), 0)
}

export async function calculate(
  ctx: AppContext,
  employeeId: string,
  year: number,
  month: number,
  options: CalculationOptions = {},
): Promise<Calculation> {
  if (month < 1 || month > 12) throw BadRequest('Month must be between 1 and 12')

  const employee = await repo.findEmployee(ctx.db, employeeId)
  // 404, not 403. Out-of-organization rows do not exist as far as the caller
  // can tell, and the scoped client has already made sure of that.
  if (!employee) throw NotFound('Employee not found')

  const warnings: string[] = []
  const label = `${year}-${String(month).padStart(2, '0')}`

  const dateOfJoining = employee.dateOfJoining ? fromDateColumn(employee.dateOfJoining) : null
  const lastWorkingDate = employee.lastWorkingDate ? fromDateColumn(employee.lastWorkingDate) : null

  const total = daysInMonth(year, month)
  const employmentDays = employmentDaysInMonth({ year, month, dateOfJoining, lastWorkingDate })

  if (employmentDays === 0) {
    // Joined after the month, or left before it. Not a zero payslip — there is
    // no payslip, and a figure of zero would look like one.
    throw BadRequest(`${employee.fullName} was not employed in ${label}`)
  }

  if (!dateOfJoining) {
    warnings.push('No joining date is recorded, so the whole month was treated as employed.')
  }

  // The date "in force" is judged on: the first day of the month they were
  // actually employed. Usually the 1st. For somebody who joined on the 16th it
  // is the 16th, because their first salary record starts on the day they
  // joined — asking what was in force on the 1st finds nothing and reports a
  // new joiner as having no salary at all.
  //
  // One date for the whole month. A raise that starts on the 15th is next
  // month's salary; splitting a month across two salary records is a policy
  // nobody has decided, and guessing at one would give a figure no accountant
  // could reproduce.
  const monthStart = `${label}-01`
  const firstEmployedDay = toDateColumn(
    dateOfJoining && dateOfJoining > monthStart ? dateOfJoining : monthStart,
  )

  const financial = await repo.findFinancialOn(ctx.db, employeeId, firstEmployedDay)
  if (!financial) {
    // No salary on record for that month is NOT a zero salary. Returning a
    // payslip of zeros would look like a calculation; this is a missing fact.
    throw NotFound(`No salary is on record for ${employee.fullName} in ${label}`)
  }

  const policy = await repo.findPolicyOn(ctx.db, firstEmployedDay)
  if (!policy) {
    throw NotFound('No payroll policy was in force that month. Set the rates in Settings first.')
  }

  // A monthly component sitting on the salary record would be paid every
  // month at the same figure — a raise called an incentive — and prorated for
  // a short month. Neither reading is what anybody decided, so this refuses
  // rather than picking one.
  const misplaced = financial.components.filter((row) => row.component.entry === 'monthly')
  if (misplaced.length > 0) {
    throw Conflict(
      `${misplaced.map((row) => row.component.label).join(', ')} is entered each month, not on the salary record. Remove it from ${employee.fullName}'s salary and enter it for the month instead.`,
    )
  }

  const components: SalaryComponentValue[] = financial.components.map((row) => ({
    code: row.component.code,
    label: row.component.label,
    amount: Number(row.amount),
    type: row.component.type,
    countsForPf: row.component.countsForPf,
    entry: 'fixed',
  }))

  if (components.length === 0) {
    warnings.push('The salary record has no components, so every figure is zero.')
  }

  const entered = Object.entries(options.monthlyAmounts ?? {})
  if (entered.length > 0) {
    const catalogue = new Map(
      (await repo.listSalaryComponents(ctx.db)).map((component) => [component.code, component]),
    )

    for (const [code, amount] of entered) {
      const component = catalogue.get(code)
      if (!component) {
        throw BadRequest(`${code} is not a salary component this company uses`)
      }
      if (component.entry !== 'monthly') {
        // A fixed component comes from the salary record. Accepting an amount
        // for it here would let one month's calculation quietly override the
        // record, and the payslip would not match anything stored.
        throw BadRequest(`${component.label} comes from the salary record and cannot be entered for a month`)
      }
      // Nothing entered means no line, not a line reading zero.
      if (amount === 0) continue

      components.push({
        code: component.code,
        label: component.label,
        amount,
        type: component.type,
        countsForPf: component.countsForPf,
        entry: 'monthly',
      })
    }
  }

  const lopDays = options.lopDays ?? 0
  if (lopDays < 0) throw BadRequest('Loss-of-pay days cannot be negative')
  if (lopDays > employmentDays) {
    throw BadRequest(`Loss-of-pay days (${lopDays}) exceed the ${employmentDays} days employed`)
  }

  const identity = employee.statutoryIdentity
  const ptState = identity?.ptState ?? null
  const ptGender = ptGenderOf(employee.gender)

  if (!ptState) {
    warnings.push('No PT state is recorded, so no professional tax was deducted.')
  }

  const slabs: PtSlabRule[] = ptState
    ? (await repo.findPtSlabsOn(ctx.db, ptState, firstEmployedDay)).map((slab) => ({
        state: slab.state,
        gender: slab.gender,
        wageFrom: Number(slab.minGross),
        wageTo: slab.maxGross == null ? null : Number(slab.maxGross),
        amount: Number(slab.amount),
        februaryAmount: slab.februaryAmount == null ? null : Number(slab.februaryAmount),
      }))
    : []

  if (ptState && slabs.length === 0) {
    // Zero PT, and said out loud. An unconfigured state is a setup gap, not a
    // tax holiday, and it has to be closed before the first real payslip.
    warnings.push(`No PT slabs are configured for ${ptState}, so no professional tax was deducted.`)
  }

  if (ptState && ptGender === 'any' && slabs.length > 0 && !slabs.some((s) => s.gender === 'any')) {
    warnings.push(
      `${ptState} has gendered PT slabs and no gender is recorded for this employee, so no professional tax was deducted.`,
    )
  }

  const pfApplicable = identity?.pfApplicable ?? true

  const first = await repo.findFirstFinancial(ctx.db, employeeId)
  const epsMember = isEpsMember({
    dateOfJoining: employee.dateOfJoining ? fromDateColumn(employee.dateOfJoining) : null,
    pfWagesAtJoining: pfWagesOf(first),
    hasPriorMembership: identity?.hasPriorPfMembership ?? false,
  })

  if (pfApplicable && identity?.hasPriorPfMembership == null && !epsMember) {
    warnings.push(
      'Excluded from EPS as a new PF member above the wage ceiling. Confirm they were never a member before — if they were, they belong in EPS.',
    )
  }

  const esi = await coverageFor(ctx, employeeId, year, month)

  const result = computeSalary({
    components,
    paidDays: employmentDays - lopDays,
    daysInMonth: total,
    year,
    month,
    pf: {
      applicable: pfApplicable,
      employeeRate: Number(policy.pfEmployeeRate),
      employerRate: Number(policy.pfEmployerRate),
      restrictToCeiling: policy.pfRestrictToCeiling,
      wageCeiling: Number(policy.pfWageCeiling),
      epsMember,
    },
    esi: {
      covered: esi.covered,
      employeeRate: Number(policy.esiEmployeeRate),
      employerRate: Number(policy.esiEmployerRate),
    },
    pt: { state: ptState, gender: ptGender, slabs },
    tds: options.tds ?? 0,
  })

  if (result.netPayable < 0) {
    warnings.push('Deductions exceed earnings this month, so net pay is negative.')
  }

  return {
    employee: {
      id: employee.id,
      fullName: employee.fullName,
      employeeCode: employee.employeeCode,
    },
    year,
    month,
    result,
    basis: {
      salaryEffectiveFrom: fromDateColumn(financial.effectiveFrom),
      policyEffectiveFrom: fromDateColumn(policy.effectiveFrom),
      employmentDays,
      esi,
      epsMember,
      ptState,
      ptGender,
      warnings,
    },
  }
}

export async function listComponents(ctx: AppContext) {
  return repo.listSalaryComponents(ctx.db)
}

/** 404 unless the employee exists inside the caller's organization. */
export async function assertEmployeeVisible(ctx: AppContext, employeeId: string): Promise<void> {
  const employee = await repo.findEmployee(ctx.db, employeeId)
  if (!employee) throw NotFound('Employee not found')
}
