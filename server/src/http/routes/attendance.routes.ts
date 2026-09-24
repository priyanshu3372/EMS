import { Router } from 'express'
import { postPunchIn, postPunchOut, getMyToday } from '../controllers/attendance.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'

/**
 * Mounted at /api/attendance.
 *
 * `attendance:punch` is what an employee does for THEMSELVES, and is held by
 * everybody who works here. It is a different permission from
 * `attendance:mark`, which is HR recording somebody else's day — the audit
 * found the old RLS blocked an employee from updating their own row, which is
 * why nobody could ever check out.
 */
export const attendanceRouter = Router()

attendanceRouter.use(authenticate)

attendanceRouter.post('/punch-in', authorize('attendance:punch'), postPunchIn)
attendanceRouter.post('/punch-out', authorize('attendance:punch'), postPunchOut)
attendanceRouter.get('/me/today', authorize('attendance:punch'), getMyToday)
