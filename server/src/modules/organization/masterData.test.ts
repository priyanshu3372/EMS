import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { prisma } from '../../platform/db/prisma'
import { hashPassword } from '../../platform/auth/password'

/**
 * The lists an employee form offers: this company's departments, designations
 * and shifts — nobody else's, and none it has closed.
 */

const PREFIX = 'mdtest'
const PASSWORD = 'CorrectHorseBattery1'
const app = createApp()

let orgId = ''
let otherOrgId = ''
const tokens: Record<string, string> = {}

async function cleanup() {
  const org = { organization: { name: { startsWith: PREFIX } } }
  await prisma.employee.deleteMany({ where: org })
  await prisma.department.deleteMany({ where: org })
  await prisma.designation.deleteMany({ where: org })
  await prisma.shift.deleteMany({ where: org })
  await prisma.membership.deleteMany({ where: org })
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } })
  await prisma.organization.deleteMany({ where: { name: { startsWith: PREFIX } } })
}

async function login(key: string, role: 'hr' | 'employee' | 'manager' | 'super_admin') {
  const email = `${PREFIX}-${key}@example.com`
  const user = await prisma.user.create({ data: { email, passwordHash: await hashPassword(PASSWORD) } })
  await prisma.membership.create({ data: { userId: user.id, organizationId: orgId, role, status: 'active' } })
  tokens[key] = (await request(app).post('/api/auth/login').send({ identifier: email, password: PASSWORD })).body.data.accessToken
}

const get = (key: string) => request(app).get('/api/master-data').set('Authorization', `Bearer ${tokens[key]}`)

beforeAll(async () => {
  await cleanup()
  orgId = (await prisma.organization.create({ data: { name: `${PREFIX}-org` } })).id
  otherOrgId = (await prisma.organization.create({ data: { name: `${PREFIX}-other` } })).id

  await prisma.department.createMany({
    data: [
      { organizationId: orgId, name: 'Sales' },
      { organizationId: orgId, name: 'Finance' },
      { organizationId: orgId, name: 'Closed Down', archivedAt: new Date() },
      { organizationId: otherOrgId, name: 'Somebody Else' },
    ],
  })
  await prisma.designation.createMany({
    data: [
      { organizationId: orgId, name: 'Executive' },
      { organizationId: otherOrgId, name: 'Their Title' },
    ],
  })
  await prisma.shift.create({
    data: { organizationId: orgId, name: 'General', startTime: '09:30', endTime: '18:30', breakMinutes: 60, expectedHours: 9 },
  })

  await login('hr', 'hr')
  await login('mgr', 'manager')
  await login('emp', 'employee')
  await login('boss', 'super_admin')
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

describe('master data', () => {
  it("gives this company's lists, sorted, without the archived ones", async () => {
    const res = await get('hr')

    expect(res.status).toBe(200)
    expect(res.body.data.departments.map((d: { name: string }) => d.name)).toEqual(['Finance', 'Sales'])
    expect(res.body.data.designations.map((d: { name: string }) => d.name)).toEqual(['Executive'])
    expect(res.body.data.shifts).toEqual([
      expect.objectContaining({ name: 'General', start_time: '09:30', end_time: '18:30', expected_hours: 9 }),
    ])
    // Ids, because that is what an employee record stores — a name was never
    // saved, which is why new hires used to have no department.
    expect(res.body.data.departments[0].id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('is readable by anybody who can open the directory', async () => {
    expect((await get('mgr')).status).toBe(200)
  })

  it('is refused to somebody who cannot open the directory', async () => {
    expect((await get('emp')).status).toBe(403)
  })
})

describe('keeping the lists', () => {
  const send = (method: 'post' | 'patch' | 'delete', path: string, body?: object, key = 'boss') => {
    const req = request(app)[method](`/api/master-data${path}`).set('Authorization', `Bearer ${tokens[key]}`)
    return body ? req.send(body) : req
  }
  const departmentNames = async () =>
    (await get('boss')).body.data.departments.map((d: { name: string }) => d.name)

  it('adds a department, which the forms then offer', async () => {
    const res = await send('post', '/departments', { name: 'Legal' })
    expect(res.status).toBe(201)
    expect(await departmentNames()).toContain('Legal')
  })

  it('refuses the same name in different case — one department, not two', async () => {
    const res = await send('post', '/departments', { name: 'sales' })
    expect(res.status).toBe(409)
  })

  it('brings back an archived department instead of making a second one', async () => {
    const res = await send('post', '/departments', { name: 'Closed Down' })

    expect(res.status).toBe(200)
    expect(res.body.meta.restored).toBe(true)
    expect(await departmentNames()).toContain('Closed Down')
  })

  it('renames, but not onto a name already taken', async () => {
    const legal = (await get('boss')).body.data.departments.find((d: { name: string }) => d.name === 'Legal')

    expect((await send('patch', `/departments/${legal.id}`, { name: 'Finance' })).status).toBe(409)

    const renamed = await send('patch', `/departments/${legal.id}`, { name: 'Legal & Compliance' })
    expect(renamed.status).toBe(200)
    expect(renamed.body.data.name).toBe('Legal & Compliance')
  })

  it('archives rather than deletes, and the people in it stay in it', async () => {
    const dept = (await get('boss')).body.data.departments.find((d: { name: string }) => d.name === 'Legal & Compliance')
    const person = await prisma.employee.create({
      data: { organizationId: orgId, employeeCode: `${PREFIX}-p1`, fullName: 'In Legal', departmentId: dept.id },
    })

    const res = await send('delete', `/departments/${dept.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.archived).toBe(true)

    // Not offered to the next hire...
    expect(await departmentNames()).not.toContain('Legal & Compliance')
    // ...but nobody's record lost its department.
    const stillThere = await prisma.employee.findUnique({ where: { id: person.id }, include: { department: true } })
    expect(stillThere?.department?.name).toBe('Legal & Compliance')
  })

  it('keeps designations the same way', async () => {
    const res = await send('post', '/designations', { name: 'Associate' })
    expect(res.status).toBe(201)
    expect((await send('post', '/designations', { name: 'associate' })).status).toBe(409)
  })

  it('adds and edits a shift, checking its hours', async () => {
    const added = await send('post', '/shifts', {
      name: 'Night', startTime: '21:00', endTime: '06:00', breakMinutes: 30, expectedHours: 8.5,
    })
    expect(added.status).toBe(201)
    expect(added.body.data).toMatchObject({ start_time: '21:00', end_time: '06:00', expected_hours: 8.5 })

    const edited = await send('patch', `/shifts/${added.body.data.id}`, { expectedHours: 8 })
    expect(edited.status).toBe(200)
    expect(edited.body.data.expected_hours).toBe(8)

    // A time that is not a time, and hours that are not a working day.
    expect((await send('post', '/shifts', { name: 'Bad', startTime: '9:30', endTime: '18:30', breakMinutes: 60, expectedHours: 9 })).status).toBe(422)
    expect((await send('post', '/shifts', { name: 'Bad', startTime: '09:30', endTime: '18:30', breakMinutes: 60, expectedHours: 0.3 })).status).toBe(422)
  })

  it('is refused to HR — Settings belongs to Super Admin', async () => {
    expect((await send('post', '/departments', { name: 'HR Made This' }, 'hr')).status).toBe(403)
  })

  it("cannot touch another company's list", async () => {
    const theirs = await prisma.department.findFirst({ where: { organizationId: otherOrgId } })
    expect((await send('delete', `/departments/${theirs!.id}`)).status).toBe(404)
    const untouched = await prisma.department.findUnique({ where: { id: theirs!.id } })
    expect(untouched?.archivedAt).toBeNull()
  })
})
