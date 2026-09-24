import type { AppContext } from '../../platform/context'
import { NotFound, Conflict, BadRequest } from '../../platform/errors/AppError'
import { withTransaction } from '../../platform/db/transaction'
import { logger } from '../../platform/logger'
import * as repo from './settings.repository'

/**
 * Company settings.
 *
 * Two different kinds of setting live here and they are saved differently:
 *
 *   IDENTITY      address, GSTIN, phone. Facts about the company that were
 *                 always true and were simply recorded late. Overwritten.
 *
 *   POLICY        PF rates, ESI threshold, pay day. Rules that applied over a
 *                 PERIOD. Never overwritten — a change closes the old period
 *                 and opens a new one, so a payslip issued in March can still
 *                 be explained by March's rules.
 *
 * Mixing those up is how a rate change in April silently rewrites every payslip
 * already issued.
 */

export interface CompanyIdentityInput {
  name?: string | undefined
  legalName?: string | null | undefined
  gstin?: string | null | undefined
  pan?: string | null | undefined
  addressLine?: string | null | undefined
  city?: string | null | undefined
  state?: string | null | undefined
  pincode?: string | null | undefined
  phone?: string | null | undefined
  email?: string | null | undefined
  website?: string | null | undefined
  timezone?: string | undefined
  dateFormat?: string | undefined
  country?: string | undefined
  currency?: string | undefined
}

export async function getCompany(ctx: AppContext) {
  const organization = await repo.getOrganization(ctx.db, ctx.organizationId)
  if (!organization) throw NotFound('Company not found')
  return organization
}

export async function updateCompany(ctx: AppContext, input: CompanyIdentityInput) {
  const data: Record<string, unknown> = {}

  // Only the keys actually sent are written. Spreading the whole input would
  // turn "the form did not include website" into "set website to null".
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) data[key] = value
  }

  if (Object.keys(data).length === 0) throw BadRequest('Nothing to update')

  if (typeof data.country === 'string') data.country = data.country.toUpperCase()
  if (typeof data.currency === 'string') data.currency = data.currency.toUpperCase()

  const updated = await repo.updateOrganization(ctx.db, ctx.organizationId, data)

  logger.info('Company settings updated', {
    by: ctx.userId,
    fields: Object.keys(data),
  })

  return updated
}

export interface PolicyInput {
  pfEmployeeRate?: number | undefined
  pfEmployerRate?: number | undefined
  pfRestrictToCeiling?: boolean | undefined
  pfWageCeiling?: number | undefined
  esiEmployeeRate?: number | undefined
  esiEmployerRate?: number | undefined
  esiThreshold?: number | undefined
  payDay?: number | undefined
  payslipLockDay?: number | null | undefined
  weeklyOffDays?: number[] | undefined
  leaveYearStartMonth?: number | undefined
  fiscalYearStartMonth?: number | undefined
}

/**
 * The policy in force today, creating the default one if none exists.
 *
 * A company that has never opened Settings still needs rates to run payroll, so
 * the first read materialises the statutory defaults rather than returning
 * null and leaving every caller to invent them.
 */
export async function getPolicy(ctx: AppContext) {
  const current = await repo.getCurrentPolicy(ctx.db)
  if (current) return current

  return ctx.db.organizationPolicy.create({
    data: {
      organizationId: ctx.organizationId,
      effectiveFrom: today(),
      createdByUserId: ctx.userId,
    },
  })
}

export async function listPolicyHistory(ctx: AppContext) {
  return repo.listPolicies(ctx.db)
}

/** Midnight UTC of today, as a calendar date with no time component. */
function today(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * Changes the rules, by ending the current period and starting a new one.
 *
 * Except on the same day. A policy edited on the day it took effect is a
 * CORRECTION — somebody typed 21000 as 2100 and fixed it a minute later — and
 * recording that as two periods, one of them a minute long, would be noise in
 * the history and would collide on the unique effectiveFrom. Same day is
 * updated in place; any later day opens a new period.
 */
export async function updatePolicy(ctx: AppContext, input: PolicyInput) {
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) data[key] = value
  }

  if (Object.keys(data).length === 0) throw BadRequest('Nothing to update')

  const from = today()

  const policyId = await withTransaction(ctx.db, async (tx) => {
    const current = await tx.organizationPolicy.findFirst({
      where: { effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    })

    if (!current) {
      const created = await tx.organizationPolicy.create({
        data: {
          organizationId: ctx.organizationId,
          effectiveFrom: from,
          createdByUserId: ctx.userId,
          ...data,
        },
      })
      return created.id
    }

    if (current.effectiveFrom.getTime() === from.getTime()) {
      await tx.organizationPolicy.update({ where: { id: current.id }, data })
      return current.id
    }

    // Close yesterday, open today. The old row keeps every number it had, so
    // a payslip from that period is still explainable.
    await tx.organizationPolicy.update({
      where: { id: current.id },
      data: { effectiveTo: new Date(from.getTime() - 86_400_000) },
    })

    const created = await tx.organizationPolicy.create({
      data: {
        organizationId: ctx.organizationId,
        effectiveFrom: from,
        createdByUserId: ctx.userId,
        // Carry forward everything that was not explicitly changed, or the new
        // period would silently reset untouched rates to their defaults.
        pfEmployeeRate: current.pfEmployeeRate,
        pfEmployerRate: current.pfEmployerRate,
        pfRestrictToCeiling: current.pfRestrictToCeiling,
        pfWageCeiling: current.pfWageCeiling,
        esiEmployeeRate: current.esiEmployeeRate,
        esiEmployerRate: current.esiEmployerRate,
        esiThreshold: current.esiThreshold,
        payDay: current.payDay,
        payslipLockDay: current.payslipLockDay,
        weeklyOffDays: current.weeklyOffDays,
        leaveYearStartMonth: current.leaveYearStartMonth,
        fiscalYearStartMonth: current.fiscalYearStartMonth,
        ...data,
      },
    })

    return created.id
  })

  logger.info('Statutory policy updated', { by: ctx.userId, fields: Object.keys(data) })

  const policy = await ctx.db.organizationPolicy.findFirst({ where: { id: policyId } })
  if (!policy) throw NotFound('Policy was saved but could not be read back')
  return policy
}

export interface GeofenceInput {
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  maxAccuracyMeters?: number | undefined
  isActive?: boolean | undefined
}

export async function listGeofences(ctx: AppContext) {
  return repo.listGeofences(ctx.db)
}

/**
 * Saves the office location.
 *
 * Upsert by name rather than requiring an id, because the Settings page edits
 * one location and has never had an id to send — it kept this in localStorage.
 */
export async function saveGeofence(ctx: AppContext, input: GeofenceInput) {
  const existing = await ctx.db.geofenceLocation.findFirst({ where: { name: input.name } })

  const data = {
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMeters: input.radiusMeters,
    ...(input.maxAccuracyMeters === undefined ? {} : { maxAccuracyMeters: input.maxAccuracyMeters }),
    ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
  }

  const saved = existing
    ? await ctx.db.geofenceLocation.update({ where: { id: existing.id }, data })
    : await ctx.db.geofenceLocation.create({
        data: { organizationId: ctx.organizationId, name: input.name, ...data },
      })

  logger.info('Geofence saved', { by: ctx.userId, name: input.name })
  return saved
}

export async function deleteGeofence(ctx: AppContext, id: string) {
  const existing = await ctx.db.geofenceLocation.findFirst({ where: { id } })
  if (!existing) throw NotFound('Location not found')
  await ctx.db.geofenceLocation.delete({ where: { id } })
}

export interface LeaveTypeInput {
  name?: string | undefined
  code?: string | undefined
  annualQuota?: number | undefined
  isPaid?: boolean | undefined
  carryForward?: boolean | undefined
  carryForwardCap?: number | undefined
}

export async function listLeaveTypes(ctx: AppContext) {
  return repo.listLeaveTypes(ctx.db)
}

export async function createLeaveType(ctx: AppContext, input: LeaveTypeInput) {
  if (!input.name || !input.code) throw BadRequest('A leave type needs a name and a code')

  const existing = await ctx.db.leaveType.findFirst({
    where: { OR: [{ code: input.code.toUpperCase() }, { name: input.name }] },
  })
  if (existing) throw Conflict('A leave type with that name or code already exists')

  return ctx.db.leaveType.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      annualQuota: input.annualQuota ?? 0,
      isPaid: input.isPaid ?? true,
      carryForward: input.carryForward ?? false,
      carryForwardCap: input.carryForwardCap ?? 0,
    },
  })
}

export async function updateLeaveType(ctx: AppContext, id: string, input: LeaveTypeInput) {
  const existing = await repo.findLeaveType(ctx.db, id)
  if (!existing) throw NotFound('Leave type not found')

  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.code !== undefined) data.code = input.code.trim().toUpperCase()
  if (input.annualQuota !== undefined) data.annualQuota = input.annualQuota
  if (input.isPaid !== undefined) data.isPaid = input.isPaid
  if (input.carryForward !== undefined) data.carryForward = input.carryForward
  if (input.carryForwardCap !== undefined) data.carryForwardCap = input.carryForwardCap

  if (Object.keys(data).length === 0) throw BadRequest('Nothing to update')

  return ctx.db.leaveType.update({ where: { id }, data })
}

/**
 * Archives a leave type. Never deletes it.
 *
 * Ledger entries reference this row, and a balance whose type has vanished
 * cannot be explained — "4 days of what?". Archiving removes it from the
 * dropdown and leaves history intact.
 */
export async function archiveLeaveType(ctx: AppContext, id: string) {
  const existing = await repo.findLeaveType(ctx.db, id)
  if (!existing) throw NotFound('Leave type not found')

  await ctx.db.leaveType.update({ where: { id }, data: { archivedAt: new Date() } })
  logger.info('Leave type archived', { by: ctx.userId, id })
}

export async function listPtSlabs(ctx: AppContext, state?: string) {
  return repo.listPtSlabs(ctx.db, state)
}

export async function listHolidays(ctx: AppContext, year?: number) {
  return repo.listHolidays(ctx.db, year)
}
