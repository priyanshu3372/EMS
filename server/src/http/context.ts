import type { Response } from 'express'
import type { Role } from '@prisma/client'
import { Unauthorized } from '../platform/errors/AppError'
import { roleCan } from '../platform/authz/roles'
import { scopeFor, type ScopedResource, type ScopeContext } from '../platform/authz/scope'
import type { Permission } from '../platform/authz/permissions'

/**
 * Who is making this request, established by the authenticate middleware.
 *
 * Stored on res.locals rather than bolted onto req, and read back through
 * authContext() rather than accessed directly, so that a controller cannot
 * quietly proceed with `undefined` when the middleware was forgotten. Getting
 * an exception is the right outcome there; getting `undefined` where an
 * organizationId belongs is how data crosses between companies.
 */
export interface AuthContext {
  userId: string
  organizationId: string
  membershipId: string
  role: Role
  /** The caller's own Employee row, when they have one. Null for an operator. */
  employeeId: string | null

  /** Never compare roles in a controller. Ask this instead. */
  can(permission: Permission): boolean
  /** Whose rows this caller may touch for a given resource. */
  scopeFor(resource: ScopedResource): ScopeContext
}

export interface AuthContextInput {
  userId: string
  organizationId: string
  membershipId: string
  role: Role
  employeeId: string | null
}

export function setAuthContext(res: Response, input: AuthContextInput): void {
  const ctx: AuthContext = {
    ...input,
    can: (permission) => roleCan(input.role, permission),
    scopeFor: (resource) => ({
      scope: scopeFor(input.role, resource),
      employeeId: input.employeeId,
    }),
  }
  res.locals.auth = ctx
}

export function authContext(res: Response): AuthContext {
  const ctx = res.locals.auth as AuthContext | undefined
  if (!ctx) throw Unauthorized('Not authenticated')
  return ctx
}
