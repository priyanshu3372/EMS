import { Router } from 'express'
import { getEmployees, getEmployeeById } from '../controllers/employee.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'

/**
 * Mounted at /api/employees.
 *
 * `authorize('employee:read')` answers "may this person read employees at all".
 * It does NOT answer "may they read THIS one" — that is the data scope, applied
 * in the repository. A route guarded here and unscoped there is still an IDOR
 * hole, which is why the repository requires a scope argument to compile.
 *
 * Day 8 adds POST and PATCH here.
 */
export const employeeRouter = Router()

employeeRouter.use(authenticate)

employeeRouter.get('/', authorize('employee:read'), getEmployees)
employeeRouter.get('/:id', authorize('employee:read'), getEmployeeById)
