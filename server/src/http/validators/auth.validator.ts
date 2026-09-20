import { z } from 'zod'

/**
 * Login input.
 *
 * Note what is NOT here: the password policy from platform/auth/password.
 * That policy governs what a password may be SET to. Applying it at login
 * would reject an existing account whose password predates the rule, and would
 * tell an attacker the shape of every valid password before they ever guess
 * one. On the way in, any non-empty string is acceptable input — whether it is
 * correct is bcrypt's business, not the validator's.
 */
export const loginSchema = z.object({
  /// Email address or employee code. One field, because asking the user which
  /// kind of identifier they hold is a question they should not have to answer.
  identifier: z
    .string()
    .trim()
    .min(1, 'Enter your email address or employee code')
    .max(255, 'That is too long to be an email or an employee code'),

  password: z
    .string()
    .min(1, 'Enter your password')
    .max(200, 'That is too long to be a password'),
})

export type LoginBody = z.infer<typeof loginSchema>

/**
 * Changing a password.
 *
 * The length bounds here mirror platform/auth/password, but the real policy
 * check stays in the service. Duplicating the rule in two places is how they
 * drift; this schema only rejects what is obviously not a password, and the
 * service decides what is acceptable.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(200),
  newPassword: z.string().min(1, 'Enter a new password').max(200),
})

export type ChangePasswordBody = z.infer<typeof changePasswordSchema>
