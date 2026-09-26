import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { prisma } from '../../platform/db/prisma'
import { hashPassword } from '../../platform/auth/password'
import { toDateColumn } from '../../domain/shared/dates'

/**
 * Salary structures: setting what somebody is paid, without ever rewriting what
 * they were paid before.
 */

const PREFIX = 'saltest'
const PASSWORD = 'CorrectHorseBattery1'
const app = createApp()

let orgId = ''
let otherOrgId = ''
let seq = 0
const tokens: Record<string, string> = {}

async function cleanup() {
  const org = { organization: { name: { startsWith: PREFIX } } }
  await prisma.esiCoverage.deleteMany({ where: org })
  await prisma.employeeSalaryComponent.deleteMany({ where: org })
  await prisma.employeeFinancial.deleteMany({ where: org })
  await prisma.salaryComponent.deleteMany({ where: org })
  await prisma.organizationPolicy.deleteMany({ where: org })
  await prisma.employee.deleteMany({ where: org })
  await prisma.membership.deleteMany({ where: org })
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } })
  await prisma.organization.deleteMany({ where: { name: { startsWith: PREFIX } } })
}

async function login(key: string, role: 'accounts' | 'hr') {
  const email = `${PREFIX}-${key}@example.com`
  const user = await prisma.user.create({ data: { email, passwordHash: await hashPassword(PASSWORD) } })
  await prisma.membership.create({ data: { userId: user.id, organizationId: orgId, role, status: 'active' } })
  tokens[key] = (await request(app).post('/api/auth/login').send({ identifier: email, password: PASSWORD })).body.data.accessToken
}

async function hire(organizationId = orgId) {
  seq += 1
  return (
    await prisma.employee.create({
      data: {
        organizationId,
        employeeCode: `${PREFIX}-${seq}`,
        fullName: `Person ${seq}`,
        dateOfJoining: toDateColumn('2026-01-01'),
      },
    })
  ).id
}

const as = (key: string) => `Bearer ${tokens[key]}`
const put = (id: string, body: Record<string, unknown>, key = 'accounts') =>
  request(app).put(`/api/payroll/employees/${id}/salary`).set('Authorization', as(key)).send(body)
const historyOf = (id: string, key = 'accounts') =>
  request(app).get(`/api/payroll/employees/${id}/salary`).set('Authorization', as(key))

const SALARY = [
  { code: 'BASIC', amount: 20_000 },
  { code: 'HRA', amount: 8_000 },
  { code: 'SPECIAL', amount: 12_000 },
]

beforeAll(async () => {
  await cleanup()
  orgId = (await prisma.organization.create({ data: { name: `${PREFIX}-org` } })).id
  otherOrgId = (await prisma.organization.create({ data: { name: `${PREFIX}-other` } })).id

  await prisma.organizationPolicy.create({
    data: { organizationId: orgId, effectiveFrom: toDateColumn('2020-04-01') },
  })
  for (const c of [
    { code: 'BASIC', label: 'Basic', countsForPf: true, displayOrder: 1 },
    { code: 'HRA', label: 'House Rent Allowance', displayOrder: 3 },
    { code: 'SPECIAL', label: 'Special Allowance', displayOrder: 5 },
    { code: 'INCENTIVE', label: 'Incentive', displayOrder: 6, entry: 'monthly' as const },
    { code: 'CANTEEN', label: 'Canteen', displayOrder: 9, type: 'deduction' as const },
  ]) {
    await prisma.salaryComponent.create({ data: { organizationId: orgId, ...c } })
  }

  await login('accounts', 'accounts')
  await login('hr', 'hr')
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

describe('the salary roster', () => {
  it('lists everybody, and says plainly who has no salary yet', async () => {
    const id = await hire()
    const res = await request(app).get('/api/payroll/employees').set('Authorization', as('accounts'))

    expect(res.status).toBe(200)
    const row = res.body.data.find((e: { employee_id: string }) => e.employee_id === id)
    // Null, not zero: this is the list of people a payroll run cannot pay yet.
    expect(row.salary).toBeNull()
  })

  it('is closed to HR, per the client matrix', async () => {
    const res = await request(app).get('/api/payroll/employees').set('Authorization', as('hr'))
    expect(res.status).toBe(403)
  })
})

describe('setting a salary', () => {
  it('records a first salary, and payroll can calculate from it', async () => {
    const id = await hire()
    const res = await put(id, { effectiveFrom: '2026-01-01', ctc: 480_000, components: SALARY })

    expect(res.status).toBe(200)
    expect(res.body.data.history).toHaveLength(1)
    expect(res.body.data.history[0]).toMatchObject({
      effective_from: '2026-01-01',
      effective_to: null,
      ctc: 480_000,
      gross_monthly: 40_000,
    })

    // The point of all this: the engine now has something to calculate from.
    const calc = await request(app)
      .post('/api/payroll/calculate')
      .set('Authorization', as('accounts'))
      .send({ employeeId: id, year: 2026, month: 3 })
    expect(calc.status).toBe(200)
    expect(calc.body.data.gross_earnings).toBe(40_000)
  })

  it('treats a later date as a raise, and leaves the old salary exactly as it was', async () => {
    const id = await hire()
    await put(id, { effectiveFrom: '2026-01-01', ctc: 480_000, components: SALARY })
    const raise = await put(id, {
      effectiveFrom: '2026-07-01',
      ctc: 600_000,
      components: [{ code: 'BASIC', amount: 25_000 }, { code: 'HRA', amount: 10_000 }, { code: 'SPECIAL', amount: 15_000 }],
    })

    expect(raise.status).toBe(200)
    const [current, previous] = raise.body.data.history
    expect(current).toMatchObject({ effective_from: '2026-07-01', effective_to: null, gross_monthly: 50_000 })
    // Closed the day before, never edited — so June is still June.
    expect(previous).toMatchObject({ effective_from: '2026-01-01', effective_to: '2026-06-30', gross_monthly: 40_000 })

    const calc = (month: number) =>
      request(app).post('/api/payroll/calculate').set('Authorization', as('accounts'))
        .send({ employeeId: id, year: 2026, month })
    expect((await calc(6)).body.data.gross_earnings).toBe(40_000)
    expect((await calc(7)).body.data.gross_earnings).toBe(50_000)
  })

  it('treats the same date as a correction, in place', async () => {
    const id = await hire()
    await put(id, { effectiveFrom: '2026-01-01', ctc: 480_000, components: SALARY })
    const fixed = await put(id, {
      effectiveFrom: '2026-01-01',
      ctc: 486_000,
      components: [{ code: 'BASIC', amount: 20_500 }, { code: 'HRA', amount: 8_000 }, { code: 'SPECIAL', amount: 12_000 }],
    })

    expect(fixed.status).toBe(200)
    expect(fixed.body.data.history).toHaveLength(1)
    expect(fixed.body.data.history[0].ctc).toBe(486_000)
    expect(fixed.body.data.history[0].gross_monthly).toBe(40_500)
  })

  it('refuses a date before the current salary started', async () => {
    const id = await hire()
    await put(id, { effectiveFrom: '2026-04-01', ctc: 480_000, components: SALARY })
    const res = await put(id, { effectiveFrom: '2026-02-01', ctc: 400_000, components: SALARY })

    // It would rewrite a period that already had a salary.
    expect(res.status).toBe(409)
    expect((await historyOf(id)).body.data.history).toHaveLength(1)
  })

  it('keeps deductions, and drops components entered as zero', async () => {
    const id = await hire()
    const res = await put(id, {
      effectiveFrom: '2026-01-01',
      ctc: 360_000,
      components: [{ code: 'BASIC', amount: 30_000 }, { code: 'HRA', amount: 0 }, { code: 'CANTEEN', amount: 500 }],
    })

    const codes = res.body.data.history[0].components.map((c: { code: string }) => c.code)
    // A zero is the absence of the component, not a ₹0 line on every payslip.
    expect(codes).toEqual(['BASIC', 'CANTEEN'])
    // Deductions are not part of gross.
    expect(res.body.data.history[0].gross_monthly).toBe(30_000)
  })
})

describe('what a salary may not contain', () => {
  it('refuses a monthly entry such as Incentive', async () => {
    const id = await hire()
    const res = await put(id, { effectiveFrom: '2026-01-01', ctc: 480_000, components: [...SALARY, { code: 'INCENTIVE', amount: 5_000 }] })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/entered each month/)
  })

  it('refuses a component the company does not have, or the same one twice', async () => {
    const id = await hire()
    expect((await put(id, { effectiveFrom: '2026-01-01', ctc: 1, components: [{ code: 'BONUS', amount: 1 }] })).status).toBe(400)
    expect((await put(id, { effectiveFrom: '2026-01-01', ctc: 1, components: [{ code: 'BASIC', amount: 1 }, { code: 'BASIC', amount: 2 }] })).status).toBe(400)
  })

  it('refuses a salary with no earnings', async () => {
    const id = await hire()
    const res = await put(id, { effectiveFrom: '2026-01-01', ctc: 0, components: [{ code: 'CANTEEN', amount: 500 }] })
    expect(res.status).toBe(400)
  })

  it('rejects malformed input before any of that', async () => {
    const id = await hire()
    expect((await put(id, { effectiveFrom: '2026-01-01', ctc: 1, components: SALARY, note: 'x' })).status).toBe(422)
    expect((await put(id, { effectiveFrom: '2026-01-01', ctc: 1, components: [{ code: 'BASIC', amount: -5 }] })).status).toBe(422)
    expect((await put('not-a-uuid', { effectiveFrom: '2026-01-01', ctc: 1, components: SALARY })).status).toBe(422)
  })
})

describe('who may set a salary', () => {
  it('refuses HR, who can edit an employee but not their pay', async () => {
    const id = await hire()
    expect((await put(id, { effectiveFrom: '2026-01-01', ctc: 480_000, components: SALARY }, 'hr')).status).toBe(403)
    expect((await historyOf(id, 'hr')).status).toBe(403)
  })

  it("cannot reach another company's employee, and writes nothing", async () => {
    const foreign = await hire(otherOrgId)
    const res = await put(foreign, { effectiveFrom: '2026-01-01', ctc: 480_000, components: SALARY })

    expect(res.status).toBe(404)
    expect(await prisma.employeeFinancial.count({ where: { employeeId: foreign } })).toBe(0)
  })
})
