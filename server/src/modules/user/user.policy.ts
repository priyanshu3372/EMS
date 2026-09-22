import type { Role } from '@prisma/client'
import { permissionsFor } from '../../platform/authz/roles'

/**
 * The rules that stop role assignment from becoming a way to seize the system.
 *
 * Pure functions, no database, no context object — so every one of them can be
 * tested exhaustively across all seven roles in milliseconds, which is what
 * makes it reasonable to check every combination rather than the two somebody
 * thought of.
 */

/**
 * Is `candidate` a strictly wider set of powers than `actor` holds?
 *
 * Defined by PERMISSIONS, not by a hand-written ranking of roles. A ranking
 * (super_admin > admin > hr > …) looks tidy and is wrong the moment roles stop
 * being a straight line — accounts can run payroll and hr cannot, so neither
 * one is "above" the other. Comparing the actual permission sets asks the
 * question that matters: would this grant hand out something the grantor does
 * not have?
 */
export function grantsMoreThan(candidate: Role, actor: Role): boolean {
  const held = new Set<string>(permissionsFor(actor))
  return permissionsFor(candidate).some((permission) => !held.has(permission))
}

export type RoleChangeRefusal =
  | 'own_role'
  | 'broader_than_actor'
  | 'last_super_admin'

export interface RoleChangeInput {
  actorMembershipId: string
  actorRole: Role
  targetMembershipId: string
  targetCurrentRole: Role
  newRole: Role
  /** Active super_admins in this organization, counted including the target. */
  activeSuperAdminCount: number
}

/**
 * Returns why a role change must be refused, or null if it may proceed.
 *
 * Returning a reason rather than throwing keeps this callable from a test and
 * from a "can I?" check in the UI, and keeps the HTTP status decision in the
 * service where it belongs.
 */
export function refuseRoleChange(input: RoleChangeInput): RoleChangeRefusal | null {
  // 1. You cannot change your own role.
  //
  // Not even downwards, and not even as super_admin. Allowing it means the only
  // super_admin can demote themselves and lock the company out of its own
  // settings with no way back short of a database edit. It also removes the
  // "I was already an admin, I just adjusted myself" story entirely.
  if (input.actorMembershipId === input.targetMembershipId) {
    return 'own_role'
  }

  // 2. You cannot grant powers you do not hold.
  //
  // Without this, any role that could assign roles could assign super_admin and
  // then log in as that person — or simply create one. Privilege escalation by
  // proxy rather than by self-promotion, and it looks like ordinary admin work
  // in the audit log.
  if (grantsMoreThan(input.newRole, input.actorRole)) {
    return 'broader_than_actor'
  }

  // 3. The last active super_admin cannot be demoted.
  //
  // The company would be left with nobody who can manage users or settings, and
  // no route back — bootstrap refuses to run a second time by design. This is
  // the one rule that protects against a mistake rather than an attack.
  if (
    input.targetCurrentRole === 'super_admin' &&
    input.newRole !== 'super_admin' &&
    input.activeSuperAdminCount <= 1
  ) {
    return 'last_super_admin'
  }

  return null
}

export const REFUSAL_MESSAGES: Record<RoleChangeRefusal, string> = {
  own_role: 'You cannot change your own role. Ask another administrator.',
  broader_than_actor: 'You cannot grant a role with more access than your own.',
  last_super_admin:
    'This is the last active super admin. Promote someone else first, or the company will have no administrator.',
}

/**
 * The same protection for deactivation and termination: the last active super
 * admin must not be removed, and nobody may lock themselves out.
 */
export type AccountChangeRefusal = 'own_account' | 'last_super_admin'

export function refuseAccountChange(input: {
  actorMembershipId: string
  targetMembershipId: string
  targetRole: Role
  activeSuperAdminCount: number
}): AccountChangeRefusal | null {
  if (input.actorMembershipId === input.targetMembershipId) {
    return 'own_account'
  }

  if (input.targetRole === 'super_admin' && input.activeSuperAdminCount <= 1) {
    return 'last_super_admin'
  }

  return null
}

export const ACCOUNT_REFUSAL_MESSAGES: Record<AccountChangeRefusal, string> = {
  own_account: 'You cannot deactivate or remove your own account.',
  last_super_admin:
    'This is the last active super admin. Promote someone else first, or the company will have no administrator.',
}
