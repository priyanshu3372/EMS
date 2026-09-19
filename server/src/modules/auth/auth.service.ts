import { Unauthorized } from '../../platform/errors/AppError'
import { verifyPassword } from '../../platform/auth/password'
import { signAccessToken, signRefreshToken } from '../../platform/auth/jwt'
import { logger } from '../../platform/logger'
import {
  findIdentityByEmail,
  findIdentityByEmployeeCode,
  type AuthIdentity,
} from './auth.repository'

export interface LoginInput {
  /// Email address or employee code. The user is not asked which.
  identifier: string
  password: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  refreshTokenId: string
  refreshFamilyId: string
  user: {
    id: string
    email: string
    role: string
    organizationId: string
    organizationName: string
    employee: { id: string; fullName: string; employeeCode: string } | null
  }
}

/** Anything with an @ is treated as an email. Employee codes never contain one. */
function looksLikeEmail(identifier: string): boolean {
  return identifier.includes('@')
}

async function resolveIdentity(identifier: string): Promise<AuthIdentity | null> {
  return looksLikeEmail(identifier)
    ? findIdentityByEmail(identifier)
    : findIdentityByEmployeeCode(identifier)
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const identity = await resolveIdentity(input.identifier)

  // Verify unconditionally. When there is no such user we still spend the
  // ~250ms bcrypt costs, because a fast rejection and a slow one are
  // distinguishable over the network — and that difference is a free list of
  // which email addresses have accounts.
  const passwordOk = await verifyPassword(input.password, identity?.passwordHash ?? null)

  if (!identity || !passwordOk) {
    logger.warn('Login failed', { identifier: input.identifier, reason: 'bad_credentials' })
    throw Unauthorized('Incorrect email or password')
  }

  // Only past this line do we know the caller actually owns this account. That
  // is what makes a specific message safe here: an attacker without the
  // password never reaches it, and a real suspended employee deserves to be
  // told why they cannot get in rather than doubting their own password.
  if (identity.status !== 'active') {
    logger.warn('Login blocked', {
      userId: identity.userId,
      reason: identity.status === 'invited' ? 'not_activated' : 'inactive',
    })
    throw Unauthorized(
      identity.status === 'invited'
        ? 'This account has not been activated yet. Use the invitation link sent to you.'
        : 'This account is not active. Contact your administrator.',
    )
  }

  const accessToken = signAccessToken({
    sub: identity.userId,
    org: identity.organizationId,
    mem: identity.membershipId,
    role: identity.role,
    ver: identity.tokenVersion,
  })

  // A login always starts a new family. Day 5 continues an existing one on
  // refresh, which is what makes reuse detectable.
  const refresh = signRefreshToken(identity.userId)

  logger.info('Login succeeded', {
    userId: identity.userId,
    organizationId: identity.organizationId,
    role: identity.role,
  })

  return {
    accessToken,
    refreshToken: refresh.token,
    refreshTokenId: refresh.jti,
    refreshFamilyId: refresh.familyId,
    user: {
      id: identity.userId,
      email: identity.email,
      role: identity.role,
      organizationId: identity.organizationId,
      organizationName: identity.organizationName,
      employee: identity.employee,
    },
  }
}
