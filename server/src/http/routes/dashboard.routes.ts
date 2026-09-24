import { Router } from 'express'
import { getCompanySummary, getMySummary } from '../controllers/dashboard.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'

/**
 * Mounted at /api/dashboard.
 *
 * The company view is gated on `employee:read` — "may you see other people at
 * all". `attendance:read` would NOT work here: an employee holds it for their
 * own rows, so they would be handed a company dashboard containing only
 * themselves. Not a leak, but a page that makes no sense for them, and a
 * permission chosen for the wrong reason tends to be copied.
 *
 * The data scope then narrows what they see: a manager's figures cover their
 * team, HR's cover the company. One endpoint, two different truths, decided by
 * who is asking rather than by which page called it.
 *
 * `/me` needs only `dashboard:read`, which everybody holds. It is about the
 * caller and takes no id, so there is nothing to point at anybody else.
 */
export const dashboardRouter = Router()

dashboardRouter.use(authenticate)

dashboardRouter.get('/summary', authorize('employee:read'), getCompanySummary)
dashboardRouter.get('/me', authorize('dashboard:read'), getMySummary)
