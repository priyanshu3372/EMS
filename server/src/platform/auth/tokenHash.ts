import { createHash, randomBytes } from 'node:crypto'

/**
 * Hashes a refresh token for storage.
 *
 * sha256, and deliberately NOT bcrypt — which looks wrong until you ask what
 * each one is for.
 *
 * Bcrypt is slow on purpose. That slowness is worth paying for a password,
 * because a password is short, low-entropy and chosen by a human, so an
 * attacker holding the hashes can guess at it. Making each guess cost a quarter
 * of a second is what makes that hopeless.
 *
 * A refresh token is 256 bits of machine randomness. There is nothing to guess
 * — no dictionary, no pattern, no human habit to exploit. Bcrypt's slowness
 * would therefore buy no security at all, while being paid on every single
 * refresh request by every logged-in user. sha256 is the right tool for hashing
 * a secret that is already unguessable.
 *
 * What the hash IS for: if this database is ever dumped, the rows must not be a
 * folder full of working sessions. Storing raw session tokens is the same
 * mistake as storing raw passwords, and it is made far more often.
 */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/** Refresh tokens. Named separately so call sites say what they are hashing. */
export const hashRefreshToken = hashToken

/** Invitation and password-reset tokens. Same reasoning, same algorithm. */
export const hashInviteToken = hashToken

/**
 * A new opaque token: 32 bytes of randomness, url-safe so it survives being
 * pasted into an email or a query string.
 *
 * Not a JWT. A JWT would be self-validating, which is exactly wrong here — an
 * invitation must be revocable and single-use, and that requires looking it up.
 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}
