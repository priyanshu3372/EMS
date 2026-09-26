import type { RequestHandler } from 'express'
import type { Prisma } from '@prisma/client'
import {
  masterData,
  addNamed,
  renameNamed,
  archiveNamed,
  addShift,
  editShift,
  archiveShift,
} from '../../modules/organization/masterData.service'
import type { NamedKind } from '../../modules/organization/masterData.repository'
import { parseBody } from '../validators/parse'
import {
  masterDataIdSchema,
  namedSchema,
  shiftSchema,
  shiftUpdateSchema,
} from '../validators/masterData.validator'
import { appContext } from '../context'

/** GET /api/master-data */
export const getMasterData: RequestHandler = async (_req, res) => {
  const ctx = appContext(res)
  const data = await masterData(ctx)

  res.status(200).json({
    data: {
      departments: data.departments,
      designations: data.designations,
      shifts: data.shifts.map((shift) => ({
        id: shift.id,
        name: shift.name,
        start_time: shift.startTime,
        end_time: shift.endTime,
        break_minutes: shift.breakMinutes,
        expected_hours: Number(shift.expectedHours),
      })),
    },
    meta: { requestId: res.locals.requestId },
  })
}

function named(row: { id: string; name: string; archivedAt: Date | null }) {
  return { id: row.id, name: row.name, archived: row.archivedAt !== null }
}

function shift(row: {
  id: string
  name: string
  startTime: string
  endTime: string
  breakMinutes: number
  expectedHours: Prisma.Decimal
  archivedAt: Date | null
}) {
  return {
    id: row.id,
    name: row.name,
    start_time: row.startTime,
    end_time: row.endTime,
    break_minutes: row.breakMinutes,
    expected_hours: Number(row.expectedHours),
    archived: row.archivedAt !== null,
  }
}

const reply = (res: Parameters<RequestHandler>[1], status: number, data: unknown, extra: object = {}) =>
  res.status(status).json({ data, meta: { requestId: res.locals.requestId, ...extra } })

/** POST /api/master-data/{departments|designations} — adds, or restores an archived one of that name. */
export const postNamed = (kind: NamedKind): RequestHandler => async (req, res) => {
  const ctx = appContext(res)
  const { name } = parseBody(namedSchema, req.body)
  const { row, restored } = await addNamed(ctx, kind, name)
  // 201 for a new row, 200 for one brought back — and said, so the page can
  // tell the person their old department reappeared rather than a new one.
  reply(res, restored ? 200 : 201, named(row), { restored })
}

/** PATCH /api/master-data/{departments|designations}/:id — renames. */
export const patchNamed = (kind: NamedKind): RequestHandler => async (req, res) => {
  const ctx = appContext(res)
  const { id } = parseBody(masterDataIdSchema, req.params)
  const { name } = parseBody(namedSchema, req.body)
  reply(res, 200, named(await renameNamed(ctx, kind, id, name)))
}

/** DELETE /api/master-data/{departments|designations}/:id — archives. Never deletes. */
export const deleteNamed = (kind: NamedKind): RequestHandler => async (req, res) => {
  const ctx = appContext(res)
  const { id } = parseBody(masterDataIdSchema, req.params)
  reply(res, 200, named(await archiveNamed(ctx, kind, id)))
}

/** POST /api/master-data/shifts */
export const postShift: RequestHandler = async (req, res) => {
  const ctx = appContext(res)
  const input = parseBody(shiftSchema, req.body)
  const { row, restored } = await addShift(ctx, input)
  reply(res, restored ? 200 : 201, shift(row), { restored })
}

/** PATCH /api/master-data/shifts/:id */
export const patchShift: RequestHandler = async (req, res) => {
  const ctx = appContext(res)
  const { id } = parseBody(masterDataIdSchema, req.params)
  const input = parseBody(shiftUpdateSchema, req.body)
  reply(res, 200, shift(await editShift(ctx, id, input)))
}

/** DELETE /api/master-data/shifts/:id — archives. */
export const deleteShift: RequestHandler = async (req, res) => {
  const ctx = appContext(res)
  const { id } = parseBody(masterDataIdSchema, req.params)
  reply(res, 200, shift(await archiveShift(ctx, id)))
}
