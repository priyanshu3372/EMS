import type { Response } from 'express'
import { Unauthorized } from '../platform/errors/AppError'

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
  role: string
}

export function setAuthContext(res: Response, ctx: AuthContext): void {
  res.locals.auth = ctx
}

export function authContext(res: Response): AuthContext {
  const ctx = res.locals.auth as AuthContext | undefined
  if (!ctx) throw Unauthorized('Not authenticated')
  return ctx
}
