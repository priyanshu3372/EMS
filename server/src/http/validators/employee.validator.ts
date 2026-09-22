import { z } from 'zod'

/**
 * Query parameters for the employee list.
 *
 * Everything is optional and everything is bounded. An unbounded `search` is a
 * free full-table scan for anyone who sends a long enough string.
 */
export const employeeQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  departmentId: z.uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  /**
   * Archived employees are hidden unless asked for. They are kept because
   * statutory records must survive someone leaving — not because they belong
   * in the day-to-day list.
   */
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

export type EmployeeQuery = z.infer<typeof employeeQuerySchema>

/** Path parameter. A non-uuid is a 422, never a database round trip. */
export const employeeIdSchema = z.object({
  id: z.uuid('That is not a valid employee id'),
})
