import type { AuthIdentity } from '../../modules/auth/auth.repository'

/**
 * What a session looks like to the client.
 *
 * Built by naming every field, never by spreading the identity and deleting
 * what should not go out. AuthIdentity already carries `passwordHash`, and the
 * list will grow — a statutory id, a bank reference. An allow-list keeps every
 * one of those out by default; a deny-list leaks each new field once, and only
 * tells you afterwards.
 */
export function serializeSessionUser(identity: AuthIdentity) {
  return {
    id: identity.userId,
    email: identity.email,
    role: identity.role,
    organizationId: identity.organizationId,
    organizationName: identity.organizationName,
    employee: identity.employee
      ? {
          id: identity.employee.id,
          fullName: identity.employee.fullName,
          employeeCode: identity.employee.employeeCode,
        }
      : null,
  }
}

export type SessionUser = ReturnType<typeof serializeSessionUser>
