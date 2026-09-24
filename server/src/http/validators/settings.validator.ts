import { z } from 'zod'

/**
 * Settings input.
 *
 * Every number here is BOUNDED, and that matters more than it looks. The old
 * Payroll Settings tab accepted whatever was typed: a PF rate of 500 would be
 * saved without complaint and would not be noticed until payroll ran and every
 * salary came out negative. A validator that only checks "is it a number" is
 * not checking anything useful about a rate.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullish()

export const companySchema = z
  .object({
    name: z.string().trim().min(1, 'A company name is required').max(120).optional(),
    legalName: optionalText(200),

    // Format is not validated. A GSTIN has a checksum and a PAN has a pattern,
    // but a company setting itself up before registration is complete needs to
    // be able to save the rest of the form. Length only; correctness is a
    // separate concern and belongs where the number is actually used.
    gstin: optionalText(15),
    pan: optionalText(10),

    addressLine: optionalText(300),
    city: optionalText(80),
    state: optionalText(80),
    pincode: optionalText(10),
    phone: optionalText(20),
    email: z.email().nullish(),
    website: optionalText(200),

    timezone: z.string().trim().max(64).optional(),
    dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
    country: z.string().trim().length(2).optional(),
    currency: z.string().trim().length(3).optional(),
  })
  .strict()

/** A percentage. Nothing statutory is above 100, and nothing is negative. */
const rate = z.number().min(0, 'A rate cannot be negative').max(100, 'A rate cannot exceed 100%')

/** Rupees. Bounded so a stray keystroke cannot set a ceiling of ten crore. */
const money = z.number().min(0).max(100_000_000)

export const policySchema = z
  .object({
    pfEmployeeRate: rate.optional(),
    pfEmployerRate: rate.optional(),
    pfRestrictToCeiling: z.boolean().optional(),
    pfWageCeiling: money.optional(),

    esiEmployeeRate: rate.optional(),
    esiEmployerRate: rate.optional(),
    esiThreshold: money.optional(),

    payDay: z.number().int().min(1).max(28, 'Choose a day that exists in every month').optional(),
    // 28 rather than 31 on purpose: a pay day of the 30th silently does not
    // exist in February, and the bug only appears once a year.
    payslipLockDay: z.number().int().min(1).max(28).nullish(),

    /**
     * Which weekdays the company does not work, as Sunday=0.
     *
     * [0] is a six-day week with Sunday off; [0, 6] is the five-day week.
     * Capped at six so a company cannot accidentally close every day and
     * make leave impossible to take.
     */
    weeklyOffDays: z
      .array(z.number().int().min(0).max(6))
      .max(6, 'A company cannot be closed every day of the week')
      .optional(),

    leaveYearStartMonth: z.number().int().min(1).max(12).optional(),
    fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
  })
  .strict()

export const geofenceSchema = z
  .object({
    name: z.string().trim().min(1, 'The location needs a name').max(80),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    /// 10 m floor because the client wants 15–30 m, and a floor of 50 would
    /// have refused their actual requirement. 50 km ceiling so a typo in the
    /// kilometres box cannot cover the state.
    radiusMeters: z.number().int().min(10).max(50_000),
    /// Below 20 m no consumer phone can confirm anything, so the gate would
    /// reject every reading and nobody could punch in at all.
    maxAccuracyMeters: z.number().int().min(20).max(500).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()

export const leaveTypeSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    code: z
      .string()
      .trim()
      .min(1)
      .max(6)
      .regex(/^[A-Za-z]+$/, 'A code is letters only, for example CL or SL')
      .optional(),
    annualQuota: z.number().min(0).max(365).optional(),
    isPaid: z.boolean().optional(),
    carryForward: z.boolean().optional(),
    carryForwardCap: z.number().min(0).max(365).optional(),
  })
  .strict()
  .refine(
    (body) => !(body.carryForward === true && (body.carryForwardCap ?? 0) === 0),
    {
      path: ['carryForwardCap'],
      message: 'Carry forward is on, so set how many days may be carried',
    },
  )

export const settingsIdSchema = z.object({
  id: z.uuid('That is not a valid id'),
})

export const holidayQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
})

export const ptSlabQuerySchema = z.object({
  state: z.string().trim().max(80).optional(),
})
