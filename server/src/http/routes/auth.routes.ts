import { Router } from 'express'
import {
  postLogin,
  postRefresh,
  postLogout,
  getSession,
  postChangePassword,
  postInspectLink,
  postRedeemLink,
} from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'
import { csrfGuard } from '../middleware/csrfGuard'
import {
  loginLimiter,
  authIpLimiter,
  refreshLimiter,
  passwordLinkLimiter,
} from '../middleware/rateLimit'

/**
 * Mounted at /api/auth, which is also the refresh cookie's Path — so this
 * router is the only part of the API that ever receives that cookie.
 *
 * Three ways in, and each route uses exactly one:
 *
 *   login             nothing; it is how you get a token
 *   password-link     the link's own token, in the body — whoever holds it
 *                     is not signed in yet
 *   refresh, logout   the cookie, so both need csrfGuard
 *   session, change   the Authorization header, so neither does
 */
export const authRouter = Router()

authRouter.use(authIpLimiter)

authRouter.post('/login', loginLimiter, postLogin)

authRouter.post('/refresh', refreshLimiter, csrfGuard, postRefresh)
authRouter.post('/logout', csrfGuard, postLogout)

authRouter.get('/session', authenticate, getSession)
authRouter.post('/change-password', authenticate, postChangePassword)

authRouter.post('/password-link/inspect', passwordLinkLimiter, postInspectLink)
authRouter.post('/password-link/redeem', passwordLinkLimiter, postRedeemLink)
