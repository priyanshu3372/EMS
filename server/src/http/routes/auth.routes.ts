import { Router } from 'express'
import { postLogin } from '../controllers/auth.controller'

/**
 * Mounted at /api/auth — which is also the refresh cookie's Path, so this
 * router is the only part of the API that ever receives that cookie.
 *
 * Day 5 adds: POST /refresh, POST /logout, GET /session, POST /change-password,
 * and a rate limit across all of them.
 */
export const authRouter = Router()

authRouter.post('/login', postLogin)
