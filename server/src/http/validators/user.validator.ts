import { z } from 'zod'

/**
 * User management input.
 *
 * `super_admin` is absent from the assignable roles on purpose. Nothing stops a
 * super_admin from promoting someone to super_admin — that is a legitimate act
 * and the policy allows it — but it must be a deliberate choice, and leaving it
 * out of the invite form means a typo or a copied payload cannot produce one.
 * Promotion happens through the role endpoint, where the three invariants run.
 */
const assignableRole = z.enum(['admin', 'hr', 'manager', 'rm', 'accounts', 'employee'])

export const inviteUserSchema = z
  .object({
    email: z.email('That is not a valid email address'),
    role: assignableRole,
    fullName: z.string().trim().max(120).optional(),
    /** Given only when this invitation should also create an HR record. */
    employeeCode: z.string().trim().max(30).optional(),
  })
  .strict()

export const changeRoleSchema = z
  .object({
    // Every role here, including super_admin: a super_admin handing over to a
    // successor before leaving is exactly what this endpoint is for. The
    // invariants in user.policy are what keep it safe.
    role: z.enum(['super_admin', 'admin', 'hr', 'manager', 'rm', 'accounts', 'employee']),
  })
  .strict()

export const changeStatusSchema = z
  .object({
    // No `invited` here. That is a state the system sets when it creates an
    // invitation, not one an administrator can put somebody back into.
    status: z.enum(['active', 'inactive']),
  })
  .strict()

export const membershipIdSchema = z.object({
  id: z.uuid('That is not a valid user id'),
})
