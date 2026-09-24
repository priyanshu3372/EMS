import { z } from 'zod'

/**
 * A punch-in reading.
 *
 * All three coordinates are optional here and REQUIRED by the service when the
 * employee is in `app` mode. That split is deliberate: whether a reading is
 * needed depends on the employee, which the validator does not know — and
 * making it required for everybody would break biometric staff, who have no
 * reason to send one.
 */
export const punchInSchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    /// The browser's own error estimate. Rejected above 10 km, which is not a
    /// location at all — it is the phone saying it has no idea.
    accuracyMeters: z.number().min(0).max(10_000).optional(),
  })
  .strict()

export type PunchInBody = z.infer<typeof punchInSchema>
