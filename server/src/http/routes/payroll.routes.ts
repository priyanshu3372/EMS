import { Router } from 'express'
import { getComponents, postCalculate, postEsiRedecide } from '../controllers/payroll.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'

/**
 * Mounted at /api/payroll.
 *
 * The salary engine, reachable. Day 16 adds payroll RUNS on top — the thing
 * that snapshots a month into payslips — and they will call the same
 * calculation rather than repeat it.
 *
 * `payroll:structure:read` to see figures, `payroll:structure:manage` to change
 * a statutory decision. Held by Accounts and above; HR and managers see none
 * of it, which is the client's own matrix (§3.1).
 */
export const payrollRouter = Router()

payrollRouter.use(authenticate)

payrollRouter.get('/components', authorize('payroll:structure:read'), getComponents)
payrollRouter.post('/calculate', authorize('payroll:structure:read'), postCalculate)
payrollRouter.post(
  '/esi-coverage/redecide',
  authorize('payroll:structure:manage'),
  postEsiRedecide,
)
