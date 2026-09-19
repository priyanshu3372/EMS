/**
 * The unscoped client — for the few operations that cannot have an organization
 * yet, because finding the organization is the thing they are doing.
 *
 * There are exactly two so far:
 *
 *   1. Login. A user types an email; which company they belong to is the
 *      answer, not the question. forOrg() has nothing to be given.
 *   2. Bootstrap. It creates the first organization, so there is none.
 *
 * Everything else goes through forOrg(). The export is named `unsafeDb` on
 * purpose: it is meant to be conspicuous in review and trivial to grep for.
 *
 * Rule for using it: the query must be the one that RESOLVES an organization,
 * and whatever it returns must be scoped from that point on. Reading tenant
 * data through this client because scoping was inconvenient is a bug.
 */
export { prisma as unsafeDb } from './prisma'
