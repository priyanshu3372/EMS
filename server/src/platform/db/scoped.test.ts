import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from './prisma'
import { forOrg } from './scoped'
import { withTransaction } from './transaction'

/**
 * Integration test against the real database.
 *
 * Everything else in the system trusts that `forOrg()` cannot return another
 * company's rows. That trust has to be earned by a test that actually creates
 * two companies and tries to cross between them — not by reading the extension
 * and believing it.
 *
 * It also proves scoping survives inside a transaction, which is the one place
 * it could plausibly be lost: Prisma derives the transaction handle from the
 * client, and if extensions were ever dropped there, every transactional write
 * in the product would silently go unfiltered.
 */

const PREFIX = 'scopetest'
let orgA = ''
let orgB = ''

beforeAll(async () => {
  await prisma.employee.deleteMany({ where: { employeeCode: { startsWith: PREFIX } } })
  await prisma.organization.deleteMany({ where: { name: { startsWith: PREFIX } } })

  const a = await prisma.organization.create({ data: { name: `${PREFIX}-A` } })
  const b = await prisma.organization.create({ data: { name: `${PREFIX}-B` } })
  orgA = a.id
  orgB = b.id

  await forOrg(orgA).employee.create({
    data: { organizationId: orgA, employeeCode: `${PREFIX}-A1`, fullName: 'Anita from A' },
  })
  await forOrg(orgB).employee.create({
    data: { organizationId: orgB, employeeCode: `${PREFIX}-B1`, fullName: 'Bhavesh from B' },
  })
})

afterAll(async () => {
  await prisma.employee.deleteMany({ where: { employeeCode: { startsWith: PREFIX } } })
  await prisma.organization.deleteMany({ where: { name: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

describe('forOrg', () => {
  it('refuses to build a handle with no organization', () => {
    expect(() => forOrg('')).toThrow(/organizationId/)
  })

  it('injects organizationId on create when the caller omits it', async () => {
    // The cast is the point of the test. TypeScript requires organizationId on
    // create, which is a useful second layer — but the extension must supply it
    // even when it is absent at runtime, or the guarantee is types-only.
    const created = await forOrg(orgA).employee.create({
      data: { employeeCode: `${PREFIX}-A2`, fullName: 'Created without an org id' } as never,
    })
    expect(created.organizationId).toBe(orgA)
  })

  it('overwrites a wrong organizationId rather than trusting the caller', async () => {
    const created = await forOrg(orgA).employee.create({
      data: {
        organizationId: orgB, // deliberately wrong
        employeeCode: `${PREFIX}-A-wrongorg`,
        fullName: 'Passed the wrong company',
      },
    })
    expect(created.organizationId).toBe(orgA)
  })

  it('findMany returns only this company', async () => {
    const rows = await forOrg(orgA).employee.findMany({
      where: { employeeCode: { startsWith: PREFIX } },
    })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.organizationId === orgA)).toBe(true)
    expect(rows.some((r) => r.fullName.includes('Bhavesh'))).toBe(false)
  })

  it('findFirst cannot reach across companies even when asked by name', async () => {
    const found = await forOrg(orgA).employee.findFirst({
      where: { fullName: 'Bhavesh from B' },
    })
    expect(found).toBeNull()
  })

  it('findUnique by id reports another company row as not found', async () => {
    const bEmployee = await forOrg(orgB).employee.findFirst({
      where: { employeeCode: `${PREFIX}-B1` },
    })
    expect(bEmployee).not.toBeNull()

    const leaked = await forOrg(orgA).employee.findUnique({ where: { id: bEmployee!.id } })
    expect(leaked).toBeNull()
  })

  it('updateMany cannot touch another company', async () => {
    const result = await forOrg(orgA).employee.updateMany({
      where: { employeeCode: `${PREFIX}-B1` },
      data: { fullName: 'HIJACKED' },
    })
    expect(result.count).toBe(0)

    const untouched = await forOrg(orgB).employee.findFirst({
      where: { employeeCode: `${PREFIX}-B1` },
    })
    expect(untouched!.fullName).toBe('Bhavesh from B')
  })

  it('deleteMany cannot touch another company', async () => {
    const result = await forOrg(orgA).employee.deleteMany({
      where: { employeeCode: `${PREFIX}-B1` },
    })
    expect(result.count).toBe(0)

    const stillThere = await forOrg(orgB).employee.findFirst({
      where: { employeeCode: `${PREFIX}-B1` },
    })
    expect(stillThere).not.toBeNull()
  })

  it('count is scoped', async () => {
    const a = await forOrg(orgA).employee.count({
      where: { employeeCode: { startsWith: PREFIX } },
    })
    const b = await forOrg(orgB).employee.count({
      where: { employeeCode: { startsWith: PREFIX } },
    })
    expect(a).toBeGreaterThan(0)
    expect(b).toBe(1)
  })

  it('leaves global models alone', async () => {
    const orgs = await forOrg(orgA).organization.findMany({
      where: { name: { startsWith: PREFIX } },
    })
    expect(orgs).toHaveLength(2) // Organization is global — both are visible
  })
})

describe('withTransaction', () => {
  it('keeps company scoping inside the transaction', async () => {
    const db = forOrg(orgA)

    const seen = await withTransaction(db, async (tx) => {
      return tx.employee.findMany({ where: { employeeCode: { startsWith: PREFIX } } })
    })

    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every((r) => r.organizationId === orgA)).toBe(true)
  })

  it('injects organizationId on a write inside the transaction', async () => {
    const db = forOrg(orgA)

    const created = await withTransaction(db, async (tx) => {
      return tx.employee.create({
        data: { organizationId: orgA, employeeCode: `${PREFIX}-A3`, fullName: "Created inside a transaction" },
      })
    })

    expect(created.organizationId).toBe(orgA)
  })

  it('rolls everything back when the callback throws', async () => {
    const db = forOrg(orgA)

    await expect(
      withTransaction(db, async (tx) => {
        await tx.employee.create({
          data: { organizationId: orgA, employeeCode: `${PREFIX}-A-rollback`, fullName: "Should not survive" },
        })
        throw new Error('deliberate failure')
      }),
    ).rejects.toThrow('deliberate failure')

    const orphan = await db.employee.findFirst({
      where: { employeeCode: `${PREFIX}-A-rollback` },
    })
    expect(orphan).toBeNull()
  })
})
