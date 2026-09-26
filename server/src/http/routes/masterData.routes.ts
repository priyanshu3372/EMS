import { Router } from 'express'
import {
  getMasterData,
  postNamed,
  patchNamed,
  deleteNamed,
  postShift,
  patchShift,
  deleteShift,
} from '../controllers/masterData.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'

/**
 * Mounted at /api/master-data.
 *
 * Readable by anybody who can open the employee directory — these are the
 * names the directory itself displays. Changed only by `settings:update`,
 * because the client's matrix gives Settings to Super Admin alone.
 */
export const masterDataRouter = Router()

masterDataRouter.use(authenticate)

masterDataRouter.get('/', authorize('employee:read'), getMasterData)

const manage = authorize('settings:update')

for (const [path, kind] of [['departments', 'department'], ['designations', 'designation']] as const) {
  masterDataRouter.post(`/${path}`, manage, postNamed(kind))
  masterDataRouter.patch(`/${path}/:id`, manage, patchNamed(kind))
  masterDataRouter.delete(`/${path}/:id`, manage, deleteNamed(kind))
}

masterDataRouter.post('/shifts', manage, postShift)
masterDataRouter.patch('/shifts/:id', manage, patchShift)
masterDataRouter.delete('/shifts/:id', manage, deleteShift)
