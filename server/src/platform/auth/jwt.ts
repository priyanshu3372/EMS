import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { env } from '../../config/env'
import { Unauthorized } from '../errors/AppError'

/**
 * The two tokens, and why there are two.
 *
 * An access token is sent on every request, so it is the one an attacker is
 * most likely to capture — from a log, a proxy, an error report. It therefore
 * lives fifteen minutes and is held only in JavaScript memory.
 *
 * A refresh token is sent to exactly one path, lives in an httpOnly cookie that
 * JavaScript cannot read, and lasts a week. It buys the user a session that
 * survives a page reload without ever putting a long-lived credential where a
 * script can reach it.
 *
 * They are signed with DIFFERENT keys and carry different `aud` claims, so a
 * refresh token presented as an access token fails twice over. Day 5 adds
 * rotation and reuse detection on top of this.
 */

const ISSUER = 'ems'
const ACCESS_AUDIENCE = 'ems:access'
const REFRESH_AUDIENCE = 'ems:refresh'

/**
 * Deliberately short claim names. This token rides on every single request;
 * `organizationId` spelled out costs bytes on all of them.
 */
export interface AccessClaims {
  /// User id.
  sub: string
  /// Organization id — what forOrg() will be given for this request.
  org: string
  /// Membership id: this user's link to this organization.
  mem: string
  /// Role name. Carried for logging and the frontend's `can()`; the server
  /// still resolves permissions from its own registry, never from this claim.
  role: string
  /// The User.tokenVersion this token was minted with. If the stored version
  /// has moved on, the token is dead even though it has not expired.
  ver: number
}

export interface RefreshClaims {
  sub: string
  /// This token's own id. Day 5 stores its hash and rotates on it.
  jti: string
  /// The chain this token belongs to. Reuse anywhere in the chain kills the
  /// whole family, which is how a stolen token gets caught.
  fam: string
}

/** jsonwebtoken types expiresIn narrowly; the value is validated in env.ts. */
type Expiry = jwt.SignOptions['expiresIn']

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as Expiry,
    issuer: ISSUER,
    audience: ACCESS_AUDIENCE,
  })
}

export interface IssuedRefreshToken {
  token: string
  jti: string
  familyId: string
}

/**
 * A new family id starts a fresh chain — that is a login. Passing an existing
 * one continues the chain, which is what Day 5's rotation will do.
 */
export function signRefreshToken(userId: string, familyId = randomUUID()): IssuedRefreshToken {
  const jti = randomUUID()
  const token = jwt.sign({ sub: userId, jti, fam: familyId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as Expiry,
    issuer: ISSUER,
    audience: REFRESH_AUDIENCE,
  })
  return { token, jti, familyId }
}

export function verifyAccessToken(token: string): AccessClaims {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: ACCESS_AUDIENCE,
    }) as AccessClaims
  } catch {
    // Never report which check failed. "Expired" versus "bad signature" tells
    // an attacker whether they hold a real token, and that is worth knowing.
    throw Unauthorized('Invalid or expired token')
  }
}

export function verifyRefreshToken(token: string): RefreshClaims {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: ISSUER,
      audience: REFRESH_AUDIENCE,
    }) as RefreshClaims
  } catch {
    throw Unauthorized('Invalid or expired session')
  }
}

/**
 * Milliseconds until this token expires, read from the token itself.
 *
 * The refresh cookie's Max-Age uses this rather than its own copy of "7 days",
 * so JWT_REFRESH_EXPIRY stays the single source of truth and a cookie that
 * outlives its token becomes impossible.
 */
export function millisUntilExpiry(token: string): number {
  const decoded = jwt.decode(token)
  if (!decoded || typeof decoded === 'string' || typeof decoded.exp !== 'number') return 0
  return Math.max(0, decoded.exp * 1000 - Date.now())
}
