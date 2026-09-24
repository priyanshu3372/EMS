import type { AppContext } from '../../platform/context'
import { Conflict, Forbidden, NotFound } from '../../platform/errors/AppError'
import { withTransaction } from '../../platform/db/transaction'
import { logger } from '../../platform/logger'
import { toDateColumn, type CalendarDate } from '../../domain/shared/dates'
import { workingDays, type Weekday } from '../../domain/leave/leaveDays'
import * as repo from './leave.repository'

/**
 * Deciding on leave.
 *
 * THIS IS WHERE THE BALANCE ACTUALLY MOVES. Applying holds days; approving
 * spends them. The ledger entry is written here, in the same transaction as the
 * status change, so there is no moment where a request says approved and the
 * balance disagrees.
 *
 * Approval also writes ATTENDANCE rows for the days taken, with
 * `source = leave`. Without them a week of approved leave is a gap in the
 * attendance table, and every report has to guess whether a gap means leave,
 * a holiday, or somebody who simply never punched.
 */

/** Nobody decides their own leave, whatever permissions they hold. */
function refuseSelfApproval(ctx: AppContext, employeeId: string): void {
  if (ctx.employeeId && ctx.employeeId === employeeId) {
    // A manager who could approve their own request would be the only person
    // in the company whose leave nobody reviews — and it would look like
    // ordinary work in the log.
    throw Forbidden('You cannot decide on your own leave. Ask another approver.')
  }
}

async function leaveSettings(ctx: AppContext, from: CalendarDate, to: CalendarDate) {
  const [policy, holidays] = await Promise.all([
    ctx.db.organizationPolicy.findFirst({ where: { effectiveTo: null } }),
    ctx.db.holiday.findMany({
      where: {
        date: { gte: toDateColumn(from), lte: toDateColumn(to) },
        type: { in: ['public', 'weekly_off'] },
      },
      select: { date: true },
    }),
  ])

  return {
    weeklyOffDays: (policy?.weeklyOffDays ?? [0]) as Weekday[],
    holidays: holidays.map((h) => h.date.toISOString().slice(0, 10)),
  }
}

export async function approveLeave(
  ctx: AppContext,
  id: string,
  note?: string,
): Promise<repo.LeaveRequestRow> {
  // Read through the SCOPE first. A manager approving by id must be refused
  // for somebody outside their team — and refused with a 404, because a 403
  // would confirm the request exists.
  const request = await repo.findRequest(ctx.db, ctx.scopeFor('leave'), id)
  if (!request) throw NotFound('Leave request not found')

  refuseSelfApproval(ctx, request.employeeId)

  if (request.status !== 'pending') {
    throw Conflict(`That request is already ${request.status}.`)
  }

  const from = request.fromDate.toISOString().slice(0, 10)
  const to = request.toDate.toISOString().slice(0, 10)
  const settings = await leaveSettings(ctx, from, to)

  await withTransaction(ctx.db, async (tx) => {
    // Re-read inside the transaction. Two approvers clicking at the same moment
    // would otherwise both see `pending` and both write a ledger entry, taking
    // the days twice.
    const current = await tx.leaveRequest.findFirst({
      where: { id, status: 'pending' },
      select: { id: true },
    })
    if (!current) throw Conflict('Somebody else has already decided on that request.')

    await tx.leaveRequest.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedByUserId: ctx.userId,
        reviewedAt: new Date(),
        reviewNote: note?.trim() || null,
      },
    })

    // NEGATIVE days. The balance is the sum of these rows, so consuming leave
    // is an entry that subtracts — never an edit to a number somewhere.
    await tx.leaveLedgerEntry.create({
      data: {
        organizationId: ctx.organizationId,
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        leaveYear: request.leaveYear,
        days: -Number(request.days),
        reason: 'consumed',
        leaveRequestId: id,
        createdByUserId: ctx.userId,
      },
    })

    // Attendance for the days taken, so leave is a row rather than a gap.
    const counted = workingDays({
      from,
      to,
      weeklyOffDays: settings.weeklyOffDays,
      holidays: settings.holidays,
      halfDays: request.halfDayDates,
    })

    for (const day of counted.breakdown) {
      if (day.counted === 0) continue

      const existing = await tx.attendance.findFirst({
        where: { employeeId: request.employeeId, date: toDateColumn(day.date) },
      })

      // An existing row is NOT overwritten. Somebody who punched in and then
      // had leave approved for the same day has a real punch on record, and
      // replacing it would destroy evidence of work they actually did. The
      // clash is worth a human looking at, not a silent decision.
      if (existing) {
        logger.warn('Leave day already has attendance; left as it is', {
          employeeId: request.employeeId,
          date: day.date,
          existingSource: existing.source,
        })
        continue
      }

      await tx.attendance.create({
        data: {
          organizationId: ctx.organizationId,
          employeeId: request.employeeId,
          date: toDateColumn(day.date),
          status: 'on_leave',
          source: 'leave',
          // Half a day of leave is half a day of work, and the hours for that
          // half are whatever they actually punched — not something this can
          // invent. Null says "not recorded", which is true.
          hoursWorked: null,
          note: day.counted === 0.5 ? 'Half day leave' : null,
          markedByUserId: ctx.userId,
        },
      })
    }
  })

  logger.info('Leave approved', {
    by: ctx.userId,
    requestId: id,
    employeeId: request.employeeId,
    days: Number(request.days),
  })

  const updated = await repo.findRequest(ctx.db, ctx.scopeFor('leave'), id)
  if (!updated) throw NotFound('Leave request not found')
  return updated
}

export async function rejectLeave(
  ctx: AppContext,
  id: string,
  note?: string,
): Promise<repo.LeaveRequestRow> {
  const request = await repo.findRequest(ctx.db, ctx.scopeFor('leave'), id)
  if (!request) throw NotFound('Leave request not found')

  refuseSelfApproval(ctx, request.employeeId)

  if (request.status !== 'pending') {
    throw Conflict(`That request is already ${request.status}.`)
  }

  // No ledger entry. A rejected request never took any days, so there is
  // nothing to record against the balance — the held days are released simply
  // by no longer being pending.
  await ctx.db.leaveRequest.update({
    where: { id },
    data: {
      status: 'rejected',
      reviewedByUserId: ctx.userId,
      reviewedAt: new Date(),
      reviewNote: note?.trim() || null,
    },
  })

  logger.info('Leave rejected', { by: ctx.userId, requestId: id })

  const updated = await repo.findRequest(ctx.db, ctx.scopeFor('leave'), id)
  if (!updated) throw NotFound('Leave request not found')
  return updated
}

/**
 * Reversing an approval.
 *
 * The days come back through a REVERSING entry, not by deleting the one that
 * took them. Both facts survive: it was taken, and it was given back. Deleting
 * would leave a balance that is right and a history that cannot explain it.
 */
export async function reverseLeave(
  ctx: AppContext,
  id: string,
  note?: string,
): Promise<repo.LeaveRequestRow> {
  const request = await repo.findRequest(ctx.db, ctx.scopeFor('leave'), id)
  if (!request) throw NotFound('Leave request not found')

  if (request.status !== 'approved') {
    throw Conflict(`Only approved leave can be reversed. That request is ${request.status}.`)
  }

  await withTransaction(ctx.db, async (tx) => {
    const current = await tx.leaveRequest.findFirst({
      where: { id, status: 'approved' },
      select: { id: true },
    })
    if (!current) throw Conflict('That request has already been changed.')

    await tx.leaveRequest.update({
      where: { id },
      data: {
        status: 'cancelled',
        reviewedByUserId: ctx.userId,
        reviewedAt: new Date(),
        reviewNote: note?.trim() || 'Reversed after approval',
      },
    })

    await tx.leaveLedgerEntry.create({
      data: {
        organizationId: ctx.organizationId,
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        leaveYear: request.leaveYear,
        days: Number(request.days),
        reason: 'reversal',
        leaveRequestId: id,
        note: 'Approved leave reversed',
        createdByUserId: ctx.userId,
      },
    })

    // Only the rows this approval created. A punch on one of those days was
    // never ours to remove.
    await tx.attendance.deleteMany({
      where: {
        employeeId: request.employeeId,
        source: 'leave',
        date: { gte: request.fromDate, lte: request.toDate },
      },
    })
  })

  logger.info('Leave reversed', { by: ctx.userId, requestId: id })

  const updated = await repo.findRequest(ctx.db, ctx.scopeFor('leave'), id)
  if (!updated) throw NotFound('Leave request not found')
  return updated
}
