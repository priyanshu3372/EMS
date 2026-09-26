import { z } from 'zod'

/** Departments, designations and shifts — the company's own lists. */

export const masterDataIdSchema = z.object({ id: z.uuid('That is not a valid id') })

export const namedSchema = z
  .object({ name: z.string().trim().min(1, 'Give it a name').max(60) })
  .strict()

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 09:30')

const shiftFields = {
  name: z.string().trim().min(1, 'Give the shift a name').max(40),
  startTime: clock,
  endTime: clock,
  // Up to ten hours of breaks is a typo guard, not a labour-law opinion.
  breakMinutes: z.number().int().min(0).max(600),
  // What a full day is on this shift. Half-day and full-day thresholds are
  // fractions of it, so a nonsense value here misclassifies every day.
  expectedHours: z.number().min(0.5).max(24).multipleOf(0.25),
}

export const shiftSchema = z.object(shiftFields).strict()

export const shiftUpdateSchema = z
  .object(shiftFields)
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to change' })
