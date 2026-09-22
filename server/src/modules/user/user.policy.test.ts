import { describe, it, expect } from 'vitest'
import type { Role } from '@prisma/client'
import { refuseRoleChange, refuseAccountChange, grantsMoreThan } from './user.policy'

/**
 * The three invariants, checked across every pair of roles.
 *
 * Pure functions with no database, so exhaustive is cheap: forty-nine
 * combinations run in under a millisecond. The alternative — testing the two or
 * three cases somebody thought of — is how "accounts cannot promote to hr, but
 * can promote to super_admin" survives review.
 */

const ROLES: Role[] = ['super_admin', 'admin', 'hr', 'manager', 'rm', 'accounts', 'employee']

const ACTOR = 'membership-actor'
const TARGET = 'membership-target'

function change(overrides: Partial<Parameters<typeof refuseRoleChange>[0]> = {}) {
  return refuseRoleChange({
    actorMembershipId: ACTOR,
    actorRole: 'super_admin',
    targetMembershipId: TARGET,
    targetCurrentRole: 'employee',
    newRole: 'hr',
    activeSuperAdminCount: 2,
    ...overrides,
  })
}

describe('invariant 1 — you cannot change your own role', () => {
  it('refuses when actor and target are the same membership', () => {
    expect(change({ targetMembershipId: ACTOR })).toBe('own_role')
  })

  it('refuses even a super_admin demoting themselves', () => {
    // Allowing this means the only administrator can lock the company out of
    // its own settings, and bootstrap refuses to run a second time.
    expect(
      change({
        targetMembershipId: ACTOR,
        actorRole: 'super_admin',
        targetCurrentRole: 'super_admin',
        newRole: 'employee',
        activeSuperAdminCount: 5,
      }),
    ).toBe('own_role')
  })

  it('refuses a no-op self change too', () => {
    expect(
      change({ targetMembershipId: ACTOR, targetCurrentRole: 'hr', newRole: 'hr' }),
    ).toBe('own_role')
  })
})

describe('invariant 2 — you cannot grant more than you hold', () => {
  it('lets nobody but super_admin grant super_admin', () => {
    for (const actorRole of ROLES) {
      const refusal = change({ actorRole, newRole: 'super_admin' })
      if (actorRole === 'super_admin') {
        expect(refusal, 'super_admin may appoint a successor').toBeNull()
      } else {
        expect(refusal, `${actorRole} must not be able to create a super_admin`).toBe(
          'broader_than_actor',
        )
      }
    }
  })

  it('agrees with grantsMoreThan for every pair of roles', () => {
    for (const actorRole of ROLES) {
      for (const newRole of ROLES) {
        const refusal = change({ actorRole, newRole })
        const expected = grantsMoreThan(newRole, actorRole) ? 'broader_than_actor' : null
        expect(refusal, `${actorRole} granting ${newRole}`).toBe(expected)
      }
    }
  })

  it('compares permission sets, not a ranking of role names', () => {
    // accounts can run payroll and hr cannot; hr can approve leave and accounts
    // cannot. Neither is "above" the other, so neither may grant the other —
    // which a simple seniority ranking would get wrong in both directions.
    expect(grantsMoreThan('accounts', 'hr')).toBe(true)
    expect(grantsMoreThan('hr', 'accounts')).toBe(true)
  })

  it('lets a role grant itself, and anything strictly narrower', () => {
    expect(grantsMoreThan('hr', 'hr')).toBe(false)
    expect(grantsMoreThan('employee', 'super_admin')).toBe(false)
  })
})

describe('invariant 3 — the last super_admin cannot be demoted', () => {
  it('refuses when they are the only active one', () => {
    expect(
      change({ targetCurrentRole: 'super_admin', newRole: 'hr', activeSuperAdminCount: 1 }),
    ).toBe('last_super_admin')
  })

  it('allows it once a second exists', () => {
    expect(
      change({ targetCurrentRole: 'super_admin', newRole: 'hr', activeSuperAdminCount: 2 }),
    ).toBeNull()
  })

  it('does not block a super_admin being re-set to super_admin', () => {
    expect(
      change({
        targetCurrentRole: 'super_admin',
        newRole: 'super_admin',
        activeSuperAdminCount: 1,
      }),
    ).toBeNull()
  })
})

describe('deactivation and termination', () => {
  it('refuses to act on your own account', () => {
    expect(
      refuseAccountChange({
        actorMembershipId: ACTOR,
        targetMembershipId: ACTOR,
        targetRole: 'hr',
        activeSuperAdminCount: 3,
      }),
    ).toBe('own_account')
  })

  it('refuses to remove the last super_admin', () => {
    expect(
      refuseAccountChange({
        actorMembershipId: ACTOR,
        targetMembershipId: TARGET,
        targetRole: 'super_admin',
        activeSuperAdminCount: 1,
      }),
    ).toBe('last_super_admin')
  })

  it('allows removing an ordinary user', () => {
    expect(
      refuseAccountChange({
        actorMembershipId: ACTOR,
        targetMembershipId: TARGET,
        targetRole: 'employee',
        activeSuperAdminCount: 1,
      }),
    ).toBeNull()
  })
})
