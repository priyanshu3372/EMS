import type { RequestHandler } from 'express'
import { Unauthorized } from '../../platform/errors/AppError'
import { verifyAccessToken } from '../../platform/auth/jwt'
import { findUserCredentials } from '../../modules/auth/session.repository'
import { setAuthContext } from '../context'

/**
 * Establishes who is calling, from the Authorization header.
 *
 * The signature check alone is not enough. A signed token stays cryptographically
 * valid until it expires, so terminating someone, or their password being
 * changed after a theft, would have no effect for up to fifteen minutes. The
 * tokenVersion comparison closes that window: the version is raised on
 * termination, password change and refresh-token reuse, and any token carrying
 * an older one dies at its very next request.
 *
 * That costs one indexed primary-key read per request. It is a deliberate
 * trade: a stateless check would be marginally faster and would make instant
 * revocation impossible, which for a payroll system is the wrong side of the
 * bargain. At this scale the read does not register.
 */
export const authenticate: RequestHandler = async (req, res, next) => {
  const header = req.get('authorization')

  if (!header?.startsWith('Bearer ')) {
    throw Unauthorized('Not authenticated')
  }

  const claims = verifyAccessToken(header.slice('Bearer '.length).trim())

  const user = await findUserCredentials(claims.sub)
  if (!user) throw Unauthorized('Not authenticated')

  if (user.tokenVersion !== claims.ver) {
    throw Unauthorized('Your session has ended. Please sign in again.')
  }

  setAuthContext(res, {
    userId: claims.sub,
    organizationId: claims.org,
    membershipId: claims.mem,
    role: claims.role,
  })

  next()
}
