import { z } from 'zod'

/**
 * Payroll input.
 *
 * Bounded like every other number that turns into money. A loss-of-pay figure
 * of 300 or a TDS of minus a lakh would each produce a payslip that looks like
 * a calculation, which is worse than an error.
 */

const year = z.coerce.number().int().min(2000).max(2100)
const month = z.coerce.number().int().min(1).max(12)

export const calculationSchema = z.object({
  employeeId: z.uuid('employeeId must be a valid id'),
  year,
  month,
  // Half days are real — a half-day LOP is 0.5 — so not an integer. Capped at
  // 31 here; the service checks it against the actual employment window.
  lopDays: z.coerce.number().min(0).max(31).multipleOf(0.5).optional(),
  // Entered by hand in v1. Upper bound is a typo guard, not a tax rule.
  tds: z.coerce.number().min(0).max(10_000_000).optional(),
  // This month's amounts for `monthly` components, keyed by code:
  // { "INCENTIVE": 5000 }. Which codes are allowed is the company's catalogue,
  // checked by the service; the shape is checked here.
  monthlyAmounts: z
    .record(
      z.string().regex(/^[A-Z0-9_]{1,20}$/, 'A component code, such as INCENTIVE'),
      z.number().min(0).max(10_000_000),
    )
    .optional(),
})
  // Strict, like every other body here. Without it a misspelt `lopDay` would be
  // dropped in silence and the month calculated as if nobody had been absent.
  .strict()

export const esiRedecideSchema = z
  .object({
    employeeId: z.uuid('employeeId must be a valid id'),
    year,
    month,
  })
  .strict()

/** An employee id in the path. A non-uuid is a 422, never a database round trip. */
export const payrollEmployeeParamSchema = z.object({
  id: z.uuid('That is not a valid employee id'),
})

/**
 * A salary structure: when it starts, the annual CTC, and the monthly amount of
 * each fixed component, by code.
 */
export const salaryStructureSchema = z
  .object({
    effectiveFrom: z.iso.date('Choose the date this salary starts'),
    // Typo guards, not pay policy: a crore a month is not a salary anybody here
    // is entering by hand.
    ctc: z.number().min(0).max(1_000_000_000),
    components: z
      .array(
        z
          .object({
            code: z.string().regex(/^[A-Z0-9_]{1,20}$/, 'A component code, such as BASIC'),
            amount: z.number().min(0).max(10_000_000),
          })
          .strict(),
      )
      .min(1, 'Enter at least one component')
      .max(30),
  })
  .strict()
