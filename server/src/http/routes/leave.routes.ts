import { Router } from 'express'
import {
  postPreview,
  postLeave,
  getLeave,
  getBalances,
  deleteLeave,
  postApprove,
  postReject,
  postReverse,
} from '../controllers/leave.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'

/**
 * Mounted at /api/leave-requests.
 *
 * `leave:apply` is held by everybody who can take leave; `leave:read` decides
 * whose requests you see, narrowed further by the data scope — the company for
 * HR, direct reports for a manager, their own for an employee.
 *
 * Approving is Day 14 and is a different permission again, because approving
 * your team's leave and taking your own are not the same right.
 *
 * `/balances` is registered before nothing that could shadow it — there is no
 * GET /:id here, so the literal path cannot be swallowed by a parameter.
 */
export const leaveRouter = Router()

leaveRouter.use(authenticate)

leaveRouter.post('/preview', authorize('leave:apply'), postPreview)
leaveRouter.post('/', authorize('leave:apply'), postLeave)
leaveRouter.delete('/:id', authorize('leave:apply'), deleteLeave)

leaveRouter.get('/balances', authorize('leave:read'), getBalances)
leaveRouter.get('/', authorize('leave:read'), getLeave)

// Deciding. A different permission from applying, because approving your
// team's leave and taking your own are not the same right — and the scope
// narrows it further, so a manager cannot decide outside their team.
leaveRouter.post('/:id/approve', authorize('leave:approve'), postApprove)
leaveRouter.post('/:id/reject', authorize('leave:approve'), postReject)
leaveRouter.post('/:id/reverse', authorize('leave:approve'), postReverse)
